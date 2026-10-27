import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin, requireInvestor } from "../auth.js";
import { runMigrations } from "../migrate.js";
import { ADA, ADMIN, NO_EMAIL, bearer, fakeUserLookup, fakeVerifier, tokenFor } from "./helpers/fake-clerk.js";
import { createTestDb } from "./helpers/test-db.js";

/** @type {import("../db.js").Db} */
let db;
beforeAll(async () => {
  db = await createTestDb();
  await runMigrations(db);
});
afterAll(() => db.end());
beforeEach(async () => {
  await db.query("DELETE FROM investors.investors");
});

function quietLogger() {
  return { warn: vi.fn(), error: vi.fn() };
}

/** The guard in front of an echo route and a probe /admin route, like the portal mounts them. */
function probeApp(overrides = {}) {
  const deps = { verifier: fakeVerifier(), userLookup: fakeUserLookup(), logger: quietLogger(), ...overrides };
  const app = express();
  app.use(express.json());
  app.use(requireInvestor({ db, admins: new Set([ADMIN.id]), ...deps }));
  app.all("/whoami", (req, res) =>
    res.json({ investor: req.investor, isAdmin: req.isAdmin, frozen: Object.isFrozen(req.investor) }),
  );
  app.use("/admin", requireAdmin);
  app.get("/admin/probe", (_req, res) => res.json({ ok: true }));
  app.use((_err, _req, res, _next) => res.status(500).json({ error: "internal_error" }));
  return { app, ...deps };
}

async function investorRows() {
  const { rows } = await db.query("SELECT * FROM investors.investors ORDER BY created_at");
  return rows;
}

/** @param {string} investorId */
async function signedInCount(investorId) {
  const { rows } = await db.query(
    "SELECT count(*) AS n FROM investors.events WHERE investor_id = $1 AND type = 'signed_in'",
    [investorId],
  );
  return rows[0].n;
}

describe("requireInvestor: who gets in", () => {
  it("answers 401 unauthenticated without an Authorization header, never calling the verifier", async () => {
    const { app, verifier } = probeApp();
    const res = await request(app).get("/whoami");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthenticated" });
    expect(verifier).not.toHaveBeenCalled();
  });

  it.each([
    ["Basic", `Basic ${tokenFor(ADA.id)}`],
    ["a bare scheme", "Bearer"],
    ["two tokens", `Bearer ${tokenFor(ADA.id)} ${tokenFor(ADMIN.id)}`],
    ["an oversized token", `Bearer ${"x".repeat(9000)}`],
  ])("answers 401 for a malformed header (%s)", async (_label, header) => {
    const { app, verifier } = probeApp();
    const res = await request(app).get("/whoami").set("Authorization", header);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthenticated" });
    expect(verifier).not.toHaveBeenCalled();
  });

  it("answers 401 for a token the verifier rejects, logging the reason and never the token", async () => {
    const { app, logger } = probeApp();
    const res = await request(app).get("/whoami").set("Authorization", "Bearer forged.token.value");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthenticated" });
    expect(logger.warn).toHaveBeenCalledWith("[investors] token rejected: token-invalid");
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain("forged.token.value");
    expect(await investorRows()).toHaveLength(0);
  });

  it.each([
    ["no sub", { sub: undefined }],
    ["an empty sub", { sub: "" }],
    ["a pending session", { sts: "pending" }],
  ])("answers 401 for verified claims with %s", async (_label, claims) => {
    const { app } = probeApp();
    const res = await request(app).get("/whoami").set("Authorization", bearer(ADA.id, claims));
    expect(res.status).toBe(401);
    expect(await investorRows()).toHaveLength(0);
  });

  it("IGNORES a __session cookie holding a valid token: no Bearer header is 401", async () => {
    const { app, verifier } = probeApp();
    const res = await request(app).get("/whoami").set("Cookie", `__session=${tokenFor(ADA.id)}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthenticated" });
    expect(verifier).not.toHaveBeenCalled();
  });

  it("lets a valid token in and sets req.investor (frozen) and req.isAdmin", async () => {
    const { app } = probeApp();
    const res = await request(app).get("/whoami").set("Authorization", bearer(ADA.id, { sts: "active" }));
    expect(res.status).toBe(200);
    expect(res.body.investor).toMatchObject({ clerkUserId: ADA.id, email: ADA.email, name: ADA.name, blocked: false });
    expect(res.body.investor.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.isAdmin).toBe(false);
    expect(res.body.frozen).toBe(true);
  });
});

describe("requireInvestor: the investor row", () => {
  it("upserts once: two requests, one row, one Clerk lookup", async () => {
    const { app, userLookup } = probeApp();
    const first = await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    const second = await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    expect(second.body.investor.id).toBe(first.body.investor.id);
    const rows = await investorRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ clerk_user_id: ADA.id, email: ADA.email, name: ADA.name });
    expect(userLookup).toHaveBeenCalledTimes(1);
  });

  it("upserts once under concurrent first requests", async () => {
    const { app } = probeApp();
    const responses = await Promise.all(
      [1, 2, 3].map(() => request(app).get("/whoami").set("Authorization", bearer(ADA.id))),
    );
    expect(responses.map((res) => res.status)).toEqual([200, 200, 200]);
    expect(new Set(responses.map((res) => res.body.investor.id)).size).toBe(1);
    expect(await investorRows()).toHaveLength(1);
  });

  it("takes identity only from the token: body, query and headers naming another investor are ignored", async () => {
    const { app } = probeApp();
    const other = await request(app).get("/whoami").set("Authorization", bearer(ADMIN.id));
    const res = await request(app)
      .post(`/whoami?investor_id=${other.body.investor.id}&clerk_user_id=${ADMIN.id}`)
      .set("Authorization", bearer(ADA.id))
      .set("X-Investor-Id", other.body.investor.id)
      .send({ investor_id: other.body.investor.id, clerkUserId: ADMIN.id, email: ADMIN.email, isAdmin: true });
    expect(res.status).toBe(200);
    expect(res.body.investor).toMatchObject({ clerkUserId: ADA.id, email: ADA.email });
    expect(res.body.investor.id).not.toBe(other.body.investor.id);
    expect(res.body.isAdmin).toBe(false);
  });

  it("refuses a Clerk user without an email address (403 email_required), creating no row", async () => {
    const { app } = probeApp();
    const res = await request(app).get("/whoami").set("Authorization", bearer(NO_EMAIL.id));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "email_required" });
    expect(await investorRows()).toHaveLength(0);
  });

  it("passes a failed Clerk lookup to the error handler and caches nothing", async () => {
    const userLookup = vi.fn(async () => Promise.reject(new Error("Clerk API 503")));
    const { app } = probeApp({ userLookup });
    const res = await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    expect(res.status).toBe(500);
    expect(await investorRows()).toHaveLength(0);
  });
});

describe("requireInvestor: blocked investors and the admin gate", () => {
  it("answers 403 blocked to a blocked investor on every route", async () => {
    const { app } = probeApp();
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    await db.query("UPDATE investors.investors SET blocked = true WHERE clerk_user_id = $1", [ADA.id]);
    for (const path of ["/whoami", "/admin/probe"]) {
      const res = await request(app).get(path).set("Authorization", bearer(ADA.id));
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "blocked" });
    }
  });

  it("answers 403 forbidden to a signed-in non-admin on an /admin route", async () => {
    const { app } = probeApp();
    const res = await request(app).get("/admin/probe").set("Authorization", bearer(ADA.id));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "forbidden" });
  });

  it("lets an admin (Clerk id in the allowlist) through with 200", async () => {
    const { app } = probeApp();
    const res = await request(app).get("/admin/probe").set("Authorization", bearer(ADMIN.id));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const me = await request(app).get("/whoami").set("Authorization", bearer(ADMIN.id));
    expect(me.body.isAdmin).toBe(true);
  });

  it("does not open /admin without a token, and requireAdmin alone refuses a request the guard never saw", async () => {
    const { app } = probeApp();
    expect((await request(app).get("/admin/probe")).status).toBe(401);
    const bare = express();
    bare.use("/admin", requireAdmin);
    bare.get("/admin/probe", (_req, res) => res.json({ ok: true }));
    expect((await request(bare).get("/admin/probe")).status).toBe(403);
  });
});

describe("requireInvestor: last_seen_at and signed_in", () => {
  /** @param {string} age a Postgres interval */
  async function backdate(age, { events = false } = {}) {
    await db.query(`UPDATE investors.investors SET last_seen_at = now() - $1::interval`, [age]);
    if (events) await db.query(`UPDATE investors.events SET created_at = now() - $1::interval`, [age]);
  }

  async function adaRow() {
    return (await investorRows())[0];
  }

  it("writes signed_in on the first ever sign-in, and not again on the next request", async () => {
    const { app } = probeApp();
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    expect(await signedInCount((await adaRow()).id)).toBe(1);
  });

  it("updates last_seen_at at most once a minute", async () => {
    const { app } = probeApp();
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    await backdate("30 seconds");
    const before = (await adaRow()).last_seen_at;
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    expect((await adaRow()).last_seen_at).toEqual(before);
    await backdate("2 minutes");
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    expect((await adaRow()).last_seen_at.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it("writes signed_in again after 30 minutes away", async () => {
    const { app } = probeApp();
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    await backdate("31 minutes", { events: true });
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    expect(await signedInCount((await adaRow()).id)).toBe(2);
  });

  it("does not write signed_in for a return within 30 minutes", async () => {
    const { app } = probeApp();
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    await backdate("10 minutes", { events: true });
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    expect(await signedInCount((await adaRow()).id)).toBe(1);
  });

  it("never writes two signed_in within 30 minutes, even when last_seen_at is old", async () => {
    const { app } = probeApp();
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    await backdate("40 minutes");
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    expect(await signedInCount((await adaRow()).id)).toBe(1);
  });

  it("does not touch a blocked investor", async () => {
    const { app } = probeApp();
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    await db.query("UPDATE investors.investors SET blocked = true");
    await backdate("40 minutes", { events: true });
    const before = (await adaRow()).last_seen_at;
    await request(app).get("/whoami").set("Authorization", bearer(ADA.id));
    expect((await adaRow()).last_seen_at).toEqual(before);
    expect(await signedInCount((await adaRow()).id)).toBe(1);
  });
});
