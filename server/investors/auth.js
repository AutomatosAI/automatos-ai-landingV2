/**
 * Investor portal authentication (KP3, KP9).
 *
 * Identity comes ONLY from a verified Clerk session token sent as
 * `Authorization: Bearer <token>`: never from a body, query, other header or
 * cookie. requireInvestor verifies the token, upserts the investor row by
 * clerk_user_id (email and name from Clerk on first sight; later requests
 * read the row), refuses blocked investors and sets req.investor (frozen) and
 * req.isAdmin (the token's user id is in INVESTOR_ADMIN_CLERK_IDS).
 * requireAdmin then gates /admin. The verifier and the user lookup are
 * injectable, so tests run a fake (academy server/spine/auth.js pattern);
 * production loads @clerk/backend lazily, on the first request.
 */

/** Tags the two guards so the route-coverage test knows them by identity, not by name. */
export const GUARD = Symbol("investors.guard");

/** Longer than any Clerk session token; anything bigger is refused unread. */
const MAX_TOKEN_LENGTH = 8192;
const MAX_SUBJECT_LENGTH = 255;
const BEARER = /^Bearer ([^\s]+)$/i;

/** last_seen_at is written at most once per interval per investor. */
const TOUCH_INTERVAL_MS = 60_000;
export const USER_LOOKUP_TTL_MS = 10 * 60_000;
const USER_LOOKUP_MAX_ENTRIES = 1000;

/** An unknown signing key id re-reads the instance's key list at most this often. */
export const KID_REFRESH_COOLDOWN_MS = 30_000;
/** Known key ids are re-read after this long, so a retired key drops out. */
export const KIDS_TTL_MS = 10 * 60_000;
const MAX_KID_LENGTH = 128;

/** Every column of investors.investors, as req.investor carries it. */
export const INVESTOR_COLUMNS = `id, clerk_user_id, email, name, firm, title, investor_type, linkedin_url, cheque_size,
  country, source, marketing_opt_in, marketing_opt_in_at, profile_completed_at, blocked, created_at, last_seen_at`;

const SELECT_INVESTOR_SQL = `SELECT ${INVESTOR_COLUMNS} FROM investors.investors WHERE clerk_user_id = $1`;

// First sight: the row and its first signed_in event in one statement. A
// concurrent first request loses ON CONFLICT and reads the winner's row.
const INSERT_INVESTOR_SQL = `
  WITH created AS (
    INSERT INTO investors.investors (clerk_user_id, email, name)
    VALUES ($1, $2, $3)
    ON CONFLICT (clerk_user_id) DO NOTHING
    RETURNING ${INVESTOR_COLUMNS}
  ), first_sign_in AS (
    INSERT INTO investors.events (investor_id, type)
    SELECT id, 'signed_in' FROM created
  )
  SELECT * FROM created`;

// Once a minute at most: only the request whose UPDATE wins writes. A return
// after 30 minutes away ($2 is the previous last_seen_at) counts as a new
// sign-in, and signed_in is never written twice within 30 minutes.
const TOUCH_INVESTOR_SQL = `
  WITH touched AS (
    UPDATE investors.investors SET last_seen_at = now()
     WHERE id = $1 AND last_seen_at < now() - interval '1 minute'
    RETURNING id
  )
  INSERT INTO investors.events (investor_id, type)
  SELECT id, 'signed_in' FROM touched
   WHERE $2::timestamptz < now() - interval '30 minutes'
     AND NOT EXISTS (
       SELECT 1 FROM investors.events
        WHERE investor_id = $1 AND type = 'signed_in' AND created_at > now() - interval '30 minutes')`;

/**
 * @typedef {(token: string) => Promise<Record<string, unknown>>} Verifier
 *   resolves the verified claims, rejects for any token it does not accept
 * @typedef {{email: string | null, name: string | null}} ClerkUser
 * @typedef {(clerkUserId: string) => Promise<Readonly<ClerkUser>>} UserLookup
 * @typedef {{warn: (...args: unknown[]) => void, error: (...args: unknown[]) => void}} Logger
 * @typedef {Readonly<Record<string, unknown> & {id: string, clerkUserId: string, email: string, blocked: boolean}>} Investor
 */

/**
 * One Clerk backend client per secret key, built on first use; a failed SDK
 * load is retried on the next call.
 * @param {string} secretKey
 */
function lazyClerkClient(secretKey) {
  /** @type {Promise<any> | null} */
  let client = null;
  return () => {
    client =
      client ??
      import("@clerk/backend")
        .then(({ createClerkClient }) => createClerkClient({ secretKey }))
        .catch((err) => {
          client = null;
          throw err;
        });
    return client;
  };
}

/** @param {string} reason a Clerk TokenVerificationErrorReason */
function tokenRejected(reason) {
  return Object.assign(new Error(`token rejected: ${reason}`), { reason });
}

/**
 * The key id in a JWT's header, or null when the token is not a JWT.
 * @param {string} token
 */
export function kidOf(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const kid = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"))?.kid;
    return typeof kid === "string" && kid !== "" && kid.length <= MAX_KID_LENGTH ? kid : null;
  } catch {
    return null;
  }
}

/**
 * Clerk's verifyToken re-fetches the JWKS from Clerk's API for every key id
 * it has not cached, so forged tokens with random key ids would turn into
 * Clerk API calls. This gate knows the instance's key ids and lets a token
 * through to Clerk only when its key id is one of them; an unknown key id
 * re-reads the list at most once per cooldown (a rotated key is picked up).
 * @param {{fetchKids: () => Promise<readonly string[]>, now: () => number}} deps
 * @returns {(kid: string) => Promise<boolean>}
 */
function createKidGate({ fetchKids, now }) {
  /** @type {ReadonlySet<string>} replaced on each read, never changed */
  let kids = new Set();
  let readAt = -Infinity;
  /** @type {Promise<void> | null} */
  let reading = null;
  const read = () => {
    readAt = now();
    reading = fetchKids()
      .then((list) => {
        kids = new Set(list);
      })
      .finally(() => {
        reading = null;
      });
    return reading;
  };
  return async function isKnownKid(kid) {
    if (kids.has(kid) && now() - readAt < KIDS_TTL_MS) return true;
    if (reading) await reading;
    else if (now() - readAt >= KID_REFRESH_COOLDOWN_MS) await read();
    return kids.has(kid);
  };
}

/** @param {() => Promise<any>} client */
const clerkKids = (client) => async () => ((await (await client()).jwks.getJwks()).keys ?? []).map((key) => key.kid);

/**
 * Production verifier: @clerk/backend verifyToken with the secret key. The
 * token's azp must be one of authorizedParties; Clerk skips that check for an
 * empty list, so an empty list is refused here. A token that is not a JWT,
 * or whose key id is not the instance's, is refused before Clerk sees it.
 * @param {{secretKey: string, authorizedParties: readonly string[], now?: () => number}} options now is for tests
 * @returns {Verifier}
 */
export function createClerkVerifier({ secretKey, authorizedParties, now = Date.now }) {
  if (!secretKey) throw new TypeError("createClerkVerifier: secretKey is required");
  if (!Array.isArray(authorizedParties) || authorizedParties.length === 0) {
    throw new TypeError("createClerkVerifier: at least one authorized party is required");
  }
  const parties = Object.freeze([...authorizedParties]);
  const isKnownKid = createKidGate({ fetchKids: clerkKids(lazyClerkClient(secretKey)), now });
  return async function clerkVerifier(token) {
    const kid = kidOf(token);
    if (!kid) throw tokenRejected("token-invalid");
    if (!(await isKnownKid(kid))) throw tokenRejected("jwk-kid-mismatch");
    const { verifyToken } = await import("@clerk/backend");
    return verifyToken(token, { secretKey, authorizedParties: [...parties] });
  };
}

/**
 * Only a verified address counts: the primary one, else the first verified.
 * @param {{emailAddresses?: {id: string, emailAddress: string, verification?: {status?: string} | null}[],
 *   primaryEmailAddressId?: string | null, firstName?: string | null, lastName?: string | null}} user a Clerk User
 * @returns {Readonly<ClerkUser>}
 */
export function toClerkUser(user) {
  const verified = (user.emailAddresses ?? []).filter((address) => address.verification?.status === "verified");
  const primary = verified.find((address) => address.id === user.primaryEmailAddressId) ?? verified[0];
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return Object.freeze({ email: primary?.emailAddress?.trim() || null, name: name || null });
}

/** @param {string} secretKey */
function clerkGetUser(secretKey) {
  const client = lazyClerkClient(secretKey);
  return async (clerkUserId) => (await client()).users.getUser(clerkUserId);
}

/**
 * @param {Map<string, {expiresAt: number}>} cache
 * @param {number} now
 */
function pruneCache(cache, now) {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now || cache.size >= USER_LOOKUP_MAX_ENTRIES) cache.delete(key);
  }
}

/**
 * Clerk users.getUser behind a per-process cache (10 minutes). Concurrent
 * lookups of one user share a request; a failed lookup, or one without a
 * verified email (the user may be adding one), is not cached.
 * @param {{secretKey?: string, getUser?: (clerkUserId: string) => Promise<any>, now?: () => number,
 *   ttlMs?: number}} options getUser and now are for tests
 * @returns {UserLookup}
 */
export function createUserLookup({ secretKey, getUser, now = Date.now, ttlMs = USER_LOOKUP_TTL_MS }) {
  if (!getUser && !secretKey) throw new TypeError("createUserLookup: secretKey is required");
  const fetchUser = getUser ?? clerkGetUser(/** @type {string} */ (secretKey));
  /** @type {Map<string, {value: Promise<Readonly<ClerkUser>>, expiresAt: number}>} */
  const cache = new Map();
  return async function userLookup(clerkUserId) {
    const at = now();
    const hit = cache.get(clerkUserId);
    if (hit && hit.expiresAt > at) return hit.value;
    pruneCache(cache, at);
    const value = Promise.resolve(fetchUser(clerkUserId)).then(toClerkUser);
    cache.set(clerkUserId, { value, expiresAt: at + ttlMs });
    const evict = () => {
      if (cache.get(clerkUserId)?.value === value) cache.delete(clerkUserId);
    };
    value.then((user) => {
      if (!user.email) evict();
    }, evict);
    return value;
  };
}

/**
 * The token from `Authorization: Bearer <token>`, or null. Cookies (Clerk's
 * __session included) are never read.
 * @param {import("express").Request} req
 */
export function bearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== "string" || header.length > MAX_TOKEN_LENGTH + 7) return null;
  const match = BEARER.exec(header.trim());
  return match ? match[1] : null;
}

/**
 * The Clerk user id of an active session, or null. A pending session (an
 * unfinished Clerk session task) counts as signed out, as Clerk's own
 * middleware treats it.
 * @param {unknown} claims
 */
export function subjectOf(claims) {
  if (!claims || typeof claims !== "object") return null;
  const { sub, sts } = /** @type {{sub?: unknown, sts?: unknown}} */ (claims);
  if (sts !== undefined && sts !== "active") return null;
  if (typeof sub !== "string" || sub === "" || sub.length > MAX_SUBJECT_LENGTH) return null;
  return sub;
}

/** @param {string} key */
const camel = (key) => key.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());

/**
 * A row of INVESTOR_COLUMNS as req.investor carries it: camelCase keys, frozen.
 * @param {Record<string, unknown>} row
 * @returns {Investor}
 */
export function toInvestor(row) {
  return /** @type {Investor} */ (Object.freeze(Object.fromEntries(Object.entries(row).map(([key, value]) => [camel(key), value]))));
}

/**
 * The investor row for a verified Clerk user id, inserting it on first sight.
 * @param {import("./db.js").Db} db
 * @param {UserLookup} userLookup
 * @param {string} clerkUserId
 * @returns {Promise<{row: Record<string, any>} | {error: "email_required"}>}
 */
async function findOrCreateInvestor(db, userLookup, clerkUserId) {
  const found = await db.query(SELECT_INVESTOR_SQL, [clerkUserId]);
  if (found.rows.length > 0) return { row: found.rows[0] };
  const user = await userLookup(clerkUserId);
  if (!user.email) return { error: "email_required" };
  const created = await db.query(INSERT_INVESTOR_SQL, [clerkUserId, user.email, user.name]);
  const row = created.rows[0] ?? (await db.query(SELECT_INVESTOR_SQL, [clerkUserId])).rows[0];
  if (!row) throw new Error("investor row missing after upsert");
  return { row };
}

/**
 * @param {import("./db.js").Db} db
 * @param {Record<string, any>} row
 */
async function touchInvestor(db, row) {
  const lastSeen = row.last_seen_at instanceof Date ? row.last_seen_at : new Date(row.last_seen_at);
  if (Date.now() - lastSeen.getTime() < TOUCH_INTERVAL_MS) return;
  await db.query(TOUCH_INVESTOR_SQL, [row.id, lastSeen.toISOString()]);
}

/**
 * @param {Logger} logger
 * @param {unknown} err
 */
function logRejection(logger, err) {
  const reason = /** @type {{reason?: unknown}} */ (err)?.reason;
  const label = typeof reason === "string" ? reason : err instanceof Error ? err.name : "unknown";
  // The reason only: never the token, and never Clerk's message (it quotes the claims).
  logger.warn(`[investors] token rejected: ${label}`);
}

/**
 * @param {import("express").Response} res
 * @param {number} status
 * @param {string} error
 */
const deny = (res, status, error) => res.status(status).json({ error });

/**
 * The investor guard: every /api/investors route but GET /health runs behind it.
 * @param {{verifier: Verifier, userLookup: UserLookup, db: import("./db.js").Db,
 *   admins?: ReadonlySet<string>, logger?: Logger}} deps
 * @returns {import("express").RequestHandler}
 */
export function requireInvestor({ verifier, userLookup, db, admins = new Set(), logger = console }) {
  /** @type {import("express").RequestHandler} */
  async function investorGuard(req, res, next) {
    const token = bearerToken(req);
    if (!token) return deny(res, 401, "unauthenticated");
    let claims;
    try {
      claims = await verifier(token);
    } catch (err) {
      logRejection(logger, err);
      return deny(res, 401, "unauthenticated");
    }
    const clerkUserId = subjectOf(claims);
    if (!clerkUserId) return deny(res, 401, "unauthenticated");
    try {
      const found = await findOrCreateInvestor(db, userLookup, clerkUserId);
      if ("error" in found) return deny(res, 403, found.error);
      if (found.row.blocked) return deny(res, 403, "blocked");
      await touchInvestor(db, found.row);
      req.investor = toInvestor(found.row);
      req.isAdmin = admins.has(clerkUserId);
      return next();
    } catch (err) {
      return next(err);
    }
  }
  return Object.assign(investorGuard, { [GUARD]: "investor" });
}

/**
 * Admin gate: after investorGuard, which set req.isAdmin from the token.
 * @type {import("express").RequestHandler}
 */
export const requireAdmin = Object.assign(
  function requireAdmin(req, res, next) {
    if (req.isAdmin === true) return next();
    return deny(res, 403, "forbidden");
  },
  { [GUARD]: "admin" },
);
