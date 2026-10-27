/**
 * Investor portal configuration.
 *
 * Pure: reads only the env object it is given (never process.env), so tests
 * pass plain objects. The result is frozen all the way down. Variable NAMES
 * are safe to log (`missing` lists them); values never are.
 */

/** Variables without which the portal stays disabled. */
export const REQUIRED_VARS = Object.freeze([
  "INVESTORS_DATABASE_URL",
  "CLERK_SECRET_KEY",
  "CLERK_PUBLISHABLE_KEY",
]);

/** Document storage: all four or none (s3 is null when any is unset). */
const S3_VARS = Object.freeze({
  bucket: "INVESTOR_DOCS_BUCKET",
  region: "INVESTOR_DOCS_REGION",
  accessKeyId: "INVESTOR_DOCS_ACCESS_KEY_ID",
  secretAccessKey: "INVESTOR_DOCS_SECRET_ACCESS_KEY",
});

const DEFAULT_AUTHORIZED_PARTIES = Object.freeze(["https://automatos.app"]);

/**
 * @typedef {object} PortalConfig
 * @property {{url: string | null}} db
 * @property {{secretKey: string | null, publishableKey: string | null, authorizedParties: readonly string[]}} clerk
 * @property {ReadonlySet<string>} admins Clerk user ids allowed into /admin
 * @property {{bucket: string, region: string, accessKeyId: string, secretAccessKey: string} | null} s3
 * @property {{to: readonly string[]}} alerts
 * @property {readonly string[]} missing names of unset REQUIRED_VARS
 */

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} name
 * @returns {string | null} the trimmed value, or null when unset or blank
 */
function readVar(env, name) {
  const raw = env[name];
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value === "" ? null : value;
}

/**
 * Comma-separated list: entries trimmed, empty entries dropped.
 * @param {string | undefined} raw
 * @returns {readonly string[]}
 */
export function parseList(raw) {
  return Object.freeze(
    String(raw ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

/**
 * A Set whose add/delete/clear throw: Object.freeze alone leaves a Set's
 * contents writable.
 * @param {readonly string[]} values
 * @returns {ReadonlySet<string>}
 */
function readonlySet(values) {
  const refuse = () => {
    throw new TypeError("the portal config is read-only");
  };
  return Object.freeze(Object.assign(new Set(values), { add: refuse, delete: refuse, clear: refuse }));
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {PortalConfig["s3"]}
 */
function readS3(env) {
  const entries = Object.entries(S3_VARS).map(([key, name]) => [key, readVar(env, name)]);
  if (entries.some(([, value]) => value === null)) return null;
  return Object.freeze(Object.fromEntries(entries));
}

/**
 * @param {Record<string, string | undefined> | null} [env]
 * @returns {PortalConfig}
 */
export function readPortalConfig(env = {}) {
  const source = env ?? {};
  const parties = parseList(source.INVESTORS_AUTHORIZED_PARTIES);
  return Object.freeze({
    db: Object.freeze({ url: readVar(source, "INVESTORS_DATABASE_URL") }),
    clerk: Object.freeze({
      secretKey: readVar(source, "CLERK_SECRET_KEY"),
      publishableKey: readVar(source, "CLERK_PUBLISHABLE_KEY"),
      authorizedParties: parties.length > 0 ? parties : DEFAULT_AUTHORIZED_PARTIES,
    }),
    admins: readonlySet(parseList(source.INVESTOR_ADMIN_CLERK_IDS)),
    s3: readS3(source),
    alerts: Object.freeze({ to: parseList(source.INVESTOR_ALERT_EMAILS) }),
    missing: Object.freeze(REQUIRED_VARS.filter((name) => readVar(source, name) === null)),
  });
}
