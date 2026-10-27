import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  KIDS_TTL_MS,
  KID_REFRESH_COOLDOWN_MS,
  USER_LOOKUP_TTL_MS,
  createClerkVerifier,
  createUserLookup,
  kidOf,
  toClerkUser,
} from "../auth.js";
import { createInvestorsPortal } from "../index.js";
import * as sdk from "./helpers/clerk-sdk.js";
import { createTestDb } from "./helpers/test-db.js";

/** The Clerk SDK as auth.js sees it: vitest.config.js aliases @clerk/backend to this stub. */
const clerk = Object.freeze({
  verifyToken: sdk.verifyToken,
  getUser: sdk.users.getUser,
  getJwks: sdk.jwks.getJwks,
  createClerkClient: sdk.createClerkClient,
});

const SECRET = "sk_test_fake-secret-value";
const PARTIES = Object.freeze(["https://automatos.app"]);
const KID = "ins_key_example";

/** A JWT-shaped string with the given key id (unsigned: Clerk is mocked). */
function jwt(kid = KID, claims = { sub: "user_ada" }) {
  const part = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256", kid, typ: "JWT" })}.${part(claims)}.c2ln`;
}

const verified = { status: "verified" };
/** A Clerk User as users.getUser returns it (the fields auth.js reads). */
function clerkUser(overrides = {}) {
  return {
    id: "user_ada",
    primaryEmailAddressId: "idn_2",
    emailAddresses: [
      { id: "idn_1", emailAddress: "old@example.com", verification: verified },
      { id: "idn_2", emailAddress: "ada@example.com", verification: verified },
    ],
    firstName: "Ada",
    lastName: "Example",
    ...overrides,
  };
}

beforeEach(() => {
  sdk.resetClerkSdk();
  clerk.getJwks.mockResolvedValue({ keys: [{ kid: KID, kty: "RSA", use: "sig" }] });
});

describe("the test harness", () => {
  it("never loads the real Clerk SDK: @clerk/backend is the stub, however it is imported", async () => {
    const loaded = await Promise.all(Array.from({ length: 10 }, () => import("@clerk/backend")));
    expect(loaded.every((mod) => mod.IS_TEST_STUB === true && mod.verifyToken === clerk.verifyToken)).toBe(true);
  });
});

describe("createClerkVerifier", () => {
  const verifier = (options = {}) => createClerkVerifier({ secretKey: SECRET, authorizedParties: PARTIES, ...options });

  it("verifies with @clerk/backend verifyToken, the secret key and the authorized parties", async () => {
    clerk.verifyToken.mockResolvedValue({ sub: "user_ada", azp: "https://automatos.app" });
    const token = jwt();
    await expect(verifier()(token)).resolves.toEqual({ sub: "user_ada", azp: "https://automatos.app" });
    expect(clerk.verifyToken).toHaveBeenCalledWith(token, { secretKey: SECRET, authorizedParties: ["https://automatos.app"] });
    expect(clerk.createClerkClient).toHaveBeenCalledWith({ secretKey: SECRET });
  });

  it("rejects when Clerk rejects", async () => {
    clerk.verifyToken.mockRejectedValue(Object.assign(new Error("expired"), { reason: "token-expired" }));
    await expect(verifier()(jwt())).rejects.toMatchObject({ reason: "token-expired" });
  });

  it("refuses to build without a secret key or without authorized parties (Clerk skips azp for an empty list)", () => {
    expect(() => createClerkVerifier({ secretKey: "", authorizedParties: PARTIES })).toThrow(TypeError);
    expect(() => createClerkVerifier({ secretKey: SECRET, authorizedParties: [] })).toThrow(TypeError);
  });

  it("does not call Clerk until a token arrives", () => {
    verifier();
    expect(clerk.createClerkClient).not.toHaveBeenCalled();
    expect(clerk.verifyToken).not.toHaveBeenCalled();
  });

  it.each(["not-a-jwt", "a.b", "a.b.c", `${Buffer.from("{}").toString("base64url")}.e30.c2ln`])(
    "refuses %s as token-invalid without calling Clerk",
    async (token) => {
      await expect(verifier()(token)).rejects.toMatchObject({ reason: "token-invalid" });
      expect(clerk.getJwks).not.toHaveBeenCalled();
      expect(clerk.verifyToken).not.toHaveBeenCalled();
    },
  );
});

describe("createClerkVerifier: the key-id gate (forged tokens never reach Clerk's API)", () => {
  it("reads the key list once for a burst of forged key ids, and never verifies them", async () => {
    const verify = createClerkVerifier({ secretKey: SECRET, authorizedParties: PARTIES });
    const results = await Promise.allSettled(Array.from({ length: 50 }, (_, i) => verify(jwt(`forged_${i}`))));
    expect(results.every((result) => result.status === "rejected" && result.reason.reason === "jwk-kid-mismatch")).toBe(true);
    expect(clerk.getJwks).toHaveBeenCalledTimes(1);
    expect(clerk.verifyToken).not.toHaveBeenCalled();
  });

  it("verifies concurrent first tokens with the real key id after one shared read", async () => {
    clerk.verifyToken.mockResolvedValue({ sub: "user_ada" });
    const verify = createClerkVerifier({ secretKey: SECRET, authorizedParties: PARTIES });
    await Promise.all([verify(jwt()), verify(jwt()), verify(jwt())]);
    expect(clerk.getJwks).toHaveBeenCalledTimes(1);
    expect(clerk.verifyToken).toHaveBeenCalledTimes(3);
  });

  it("picks up a rotated key once the cooldown has passed", async () => {
    let now = 5_000_000;
    clerk.verifyToken.mockResolvedValue({ sub: "user_ada" });
    const verify = createClerkVerifier({ secretKey: SECRET, authorizedParties: PARTIES, now: () => now });
    await verify(jwt());
    clerk.getJwks.mockResolvedValue({ keys: [{ kid: KID }, { kid: "ins_key_rotated" }] });
    await expect(verify(jwt("ins_key_rotated"))).rejects.toMatchObject({ reason: "jwk-kid-mismatch" });
    expect(clerk.getJwks).toHaveBeenCalledTimes(1);
    now += KID_REFRESH_COOLDOWN_MS;
    await expect(verify(jwt("ins_key_rotated"))).resolves.toEqual({ sub: "user_ada" });
    expect(clerk.getJwks).toHaveBeenCalledTimes(2);
  });

  it("re-reads known key ids after their TTL, so a retired key drops out", async () => {
    let now = 5_000_000;
    clerk.verifyToken.mockResolvedValue({ sub: "user_ada" });
    const verify = createClerkVerifier({ secretKey: SECRET, authorizedParties: PARTIES, now: () => now });
    await verify(jwt());
    now += KIDS_TTL_MS - 1;
    await verify(jwt());
    expect(clerk.getJwks).toHaveBeenCalledTimes(1);
    now += 1;
    clerk.getJwks.mockResolvedValue({ keys: [{ kid: "ins_key_rotated" }] });
    await expect(verify(jwt())).rejects.toMatchObject({ reason: "jwk-kid-mismatch" });
    expect(clerk.getJwks).toHaveBeenCalledTimes(2);
  });

  it("rejects when the key list cannot be read, and does not retry within the cooldown", async () => {
    clerk.getJwks.mockRejectedValue(new Error("Clerk API 503"));
    const verify = createClerkVerifier({ secretKey: SECRET, authorizedParties: PARTIES });
    await expect(verify(jwt())).rejects.toThrow("Clerk API 503");
    await expect(verify(jwt())).rejects.toMatchObject({ reason: "jwk-kid-mismatch" });
    expect(clerk.getJwks).toHaveBeenCalledTimes(1);
  });

  it("kidOf reads a JWT header's kid and nothing else", () => {
    expect(kidOf(jwt("ins_abc"))).toBe("ins_abc");
    expect(kidOf(jwt(""))).toBeNull();
    expect(kidOf(jwt("x".repeat(200)))).toBeNull();
    expect(kidOf("%%%.e30.c2ln")).toBeNull();
  });
});

describe("toClerkUser", () => {
  it("takes the verified primary email and the full name", () => {
    expect(toClerkUser(clerkUser())).toEqual({ email: "ada@example.com", name: "Ada Example" });
  });

  it("never takes an unverified address: an unverified primary falls back to a verified one", () => {
    const user = clerkUser({
      emailAddresses: [
        { id: "idn_1", emailAddress: "old@example.com", verification: verified },
        { id: "idn_2", emailAddress: "claimed@example.com", verification: { status: "unverified" } },
      ],
    });
    expect(toClerkUser(user).email).toBe("old@example.com");
    const none = clerkUser({ emailAddresses: [{ id: "idn_2", emailAddress: "claimed@example.com", verification: null }] });
    expect(toClerkUser(none).email).toBeNull();
  });

  it("falls back to the first verified email, and to null for a missing name or email", () => {
    expect(toClerkUser(clerkUser({ primaryEmailAddressId: null, firstName: null, lastName: null }))).toEqual({
      email: "old@example.com",
      name: null,
    });
    expect(toClerkUser(clerkUser({ emailAddresses: [], lastName: null }))).toEqual({ email: null, name: "Ada" });
  });

  it("returns a frozen object", () => {
    expect(Object.isFrozen(toClerkUser(clerkUser()))).toBe(true);
  });
});

describe("createUserLookup", () => {
  it("calls Clerk users.getUser with a client built from the secret key", async () => {
    clerk.getUser.mockResolvedValue(clerkUser());
    const lookup = createUserLookup({ secretKey: SECRET });
    await expect(lookup("user_ada")).resolves.toEqual({ email: "ada@example.com", name: "Ada Example" });
    expect(clerk.createClerkClient).toHaveBeenCalledWith({ secretKey: SECRET });
    expect(clerk.getUser).toHaveBeenCalledWith("user_ada");
  });

  it("caches a user for 10 minutes, then asks Clerk again", async () => {
    let now = 1_000_000;
    const getUser = vi.fn(async () => clerkUser());
    const lookup = createUserLookup({ getUser, now: () => now });
    await lookup("user_ada");
    now += USER_LOOKUP_TTL_MS - 1;
    await lookup("user_ada");
    expect(getUser).toHaveBeenCalledTimes(1);
    now += 1;
    await lookup("user_ada");
    expect(getUser).toHaveBeenCalledTimes(2);
    expect(USER_LOOKUP_TTL_MS).toBe(600_000);
  });

  it("shares one Clerk request between concurrent lookups of the same user", async () => {
    const getUser = vi.fn(async () => clerkUser());
    const lookup = createUserLookup({ getUser });
    await Promise.all([lookup("user_ada"), lookup("user_ada"), lookup("user_ada")]);
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed lookup", async () => {
    const getUser = vi.fn().mockRejectedValueOnce(new Error("Clerk API 503")).mockResolvedValue(clerkUser());
    const lookup = createUserLookup({ getUser });
    await expect(lookup("user_ada")).rejects.toThrow("Clerk API 503");
    await expect(lookup("user_ada")).resolves.toEqual({ email: "ada@example.com", name: "Ada Example" });
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it("does not cache a user without a verified email (they may be adding one)", async () => {
    const getUser = vi.fn().mockResolvedValueOnce(clerkUser({ emailAddresses: [] })).mockResolvedValue(clerkUser());
    const lookup = createUserLookup({ getUser });
    await expect(lookup("user_ada")).resolves.toMatchObject({ email: null });
    await expect(lookup("user_ada")).resolves.toMatchObject({ email: "ada@example.com" });
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it("requires a secret key when no getUser is injected", () => {
    expect(() => createUserLookup({})).toThrow(TypeError);
  });
});

describe("createInvestorsPortal: the real Clerk wiring (SDK mocked)", () => {
  const ENV = Object.freeze({
    INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
    CLERK_SECRET_KEY: SECRET,
    CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
    INVESTORS_AUTHORIZED_PARTIES: "https://automatos.app, https://preview.example.com",
    INVESTOR_ADMIN_CLERK_IDS: "user_admin",
  });
  /** @type {import("../db.js").Db} */
  let db;
  let app;
  const logger = { warn: vi.fn(), error: vi.fn() };
  const get = (path, token = jwt()) => request(app).get(`/api/investors${path}`).set("Authorization", `Bearer ${token}`);
  beforeAll(async () => {
    db = await createTestDb();
    const portal = createInvestorsPortal({ env: ENV, deps: { logger, createDb: () => db } });
    await portal.start();
    app = express().use("/api/investors", portal.apiRouter);
  });
  afterAll(() => db.end());

  it("verifies the Bearer token with the configured secret key and authorized parties", async () => {
    clerk.verifyToken.mockResolvedValue({ sub: "user_ada" });
    clerk.getUser.mockResolvedValue(clerkUser());
    const token = jwt();
    expect((await get("/no-such-path", token)).status).toBe(404);
    expect(clerk.verifyToken).toHaveBeenCalledWith(token, {
      secretKey: SECRET,
      authorizedParties: ["https://automatos.app", "https://preview.example.com"],
    });
    const { rows } = await db.query("SELECT email, name FROM investors.investors WHERE clerk_user_id = $1", ["user_ada"]);
    expect(rows).toEqual([{ email: "ada@example.com", name: "Ada Example" }]);
  });

  it("answers 401 when Clerk rejects the token, logging only the reason", async () => {
    clerk.verifyToken.mockRejectedValue(Object.assign(new Error("bad azp"), { reason: "token-invalid-authorized-parties" }));
    expect((await get("/no-such-path")).status).toBe(401);
    expect(logger.warn).toHaveBeenCalledWith("[investors] token rejected: token-invalid-authorized-parties");
  });

  it("admits the admin from INVESTOR_ADMIN_CLERK_IDS past the /admin gate (404 beyond it), and nobody else", async () => {
    clerk.getUser.mockResolvedValue(clerkUser({ id: "user_admin" }));
    clerk.verifyToken.mockResolvedValue({ sub: "user_admin" });
    expect((await get("/admin/no-such-path")).status).toBe(404);
    clerk.verifyToken.mockResolvedValue({ sub: "user_ada" });
    expect((await get("/admin/no-such-path")).status).toBe(403);
  });

  it("answers a failed Clerk lookup with a JSON 500 and logs no token", async () => {
    clerk.verifyToken.mockResolvedValue({ sub: "user_new" });
    clerk.getUser.mockRejectedValue(new Error("Clerk API 503\nforged log line"));
    const token = jwt(KID, { sub: "user_new" });
    const res = await get("/no-such-path", token);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal_error" });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Clerk API 503 forged log line"));
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(token);
  });
});
