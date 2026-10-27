import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import { ADA, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { createTestDb } from "./helpers/test-db.js";

const COMPLETE = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
});

function quietLogger() {
  return { warn: vi.fn(), error: vi.fn() };
}

/** A host app shaped like server.js: the portal API mounted before express.json(). */
function hostApp(portal) {
  const app = express();
  app.use("/api/investors", portal.apiRouter);
  app.use(express.json());
  app.get("/contact", (_req, res) => res.send("contact page"));
  app.post("/api/contact", (req, res) => res.json({ got: req.body }));
  app.use((_req, res) => res.status(404).send("site 404"));
  return app;
}

/** One database for the file: start() migrates it (idempotent) instead of dialling the URL in env. */
/** @type {import("../db.js").Db} */
let sharedDb;
beforeAll(async () => {
  sharedDb = await createTestDb();
});
afterAll(() => sharedDb.end());

/** The shared database with end() stubbed, so a disabled portal closing "its" pool keeps it open. */
function borrowedDb() {
  return { ...sharedDb, end: vi.fn(async () => {}) };
}

function portalWith(env, deps = {}) {
  const logger = quietLogger();
  const createDb = vi.fn(() => borrowedDb());
  const portal = createInvestorsPortal({ env, deps: { logger, createDb, ...deps } });
  return { portal, logger, createDb };
}

describe("createInvestorsPortal: status", () => {
  it("is disabled when config is missing, naming the variables and never their values", () => {
    const { portal } = portalWith({ CLERK_SECRET_KEY: COMPLETE.CLERK_SECRET_KEY });
    const status = portal.status();
    expect(status.state).toBe("disabled");
    expect(status.reason).toBe("missing_config: INVESTORS_DATABASE_URL, CLERK_PUBLISHABLE_KEY");
    expect(status.reason).not.toContain(COMPLETE.CLERK_SECRET_KEY);
    expect(Object.isFrozen(status)).toBe(true);
  });

  it("does not throw with an empty env", () => {
    expect(() => createInvestorsPortal({ env: {}, deps: { logger: quietLogger() } })).not.toThrow();
  });

  it("is starting with complete config until start() finishes, then ready", async () => {
    const { portal } = portalWith(COMPLETE);
    expect(portal.status()).toEqual({ state: "starting" });
    await expect(portal.start()).resolves.toEqual({ state: "ready" });
    expect(portal.status()).toEqual({ state: "ready" });
  });

  it("start() stays disabled, logs the reason once and never rejects", async () => {
    const { portal, logger } = portalWith({});
    await expect(portal.start()).resolves.toMatchObject({ state: "disabled" });
    await portal.start();
    expect(portal.status().state).toBe("disabled");
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain("missing_config: INVESTORS_DATABASE_URL");
  });

  it("start() runs once: concurrent calls share one promise and open one database", async () => {
    const { portal, createDb } = portalWith(COMPLETE);
    const first = portal.start();
    expect(portal.start()).toBe(first);
    await first;
    expect(createDb).toHaveBeenCalledTimes(1);
  });

  it("exposes exactly apiRouter, appRouter, start and status, frozen", () => {
    const { portal } = portalWith({});
    expect(Object.keys(portal).sort()).toEqual(["apiRouter", "appRouter", "start", "status"]);
    expect(Object.isFrozen(portal)).toBe(true);
  });
});

describe("apiRouter when disabled", () => {
  const { portal } = portalWith({});
  const app = hostApp(portal);

  it("answers GET /health 200 {state} without auth", async () => {
    const res = await request(app).get("/api/investors/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ state: "disabled" });
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it.each([
    ["get", "/api/investors/me"],
    ["put", "/api/investors/me"],
    ["get", "/api/investors/documents"],
    ["post", "/api/investors/events"],
    ["get", "/api/investors/admin/overview"],
    ["get", "/api/investors"],
    ["get", "/api/investors/no-such-path"],
  ])("answers %s %s 503 portal_unavailable", async (method, path) => {
    const res = await request(app)[method](path).set("Authorization", "Bearer anything");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "portal_unavailable", state: "disabled" });
  });

  it("leaves the site's other routes alone", async () => {
    const page = await request(app).get("/contact");
    expect(page.status).toBe(200);
    expect(page.text).toBe("contact page");
    const contact = await request(app).post("/api/contact").send({ firstName: "Ada" });
    expect(contact.body).toEqual({ got: { firstName: "Ada" } });
    const missing = await request(app).get("/nowhere");
    expect(missing.status).toBe(404);
    expect(missing.text).toBe("site 404");
  });
});

describe("apiRouter while starting and when ready", () => {
  it("answers 503 'starting' before start() finishes", async () => {
    const { portal } = portalWith(COMPLETE);
    const app = hostApp(portal);
    const health = await request(app).get("/api/investors/health");
    expect(health.body).toEqual({ state: "starting" });
    const res = await request(app).get("/api/investors/me");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "portal_unavailable", state: "starting" });
  });

  it("passes requests on once ready (an unknown path is a JSON 404, not the site's page)", async () => {
    const { portal } = portalWith(COMPLETE, fakeAuthDeps());
    await portal.start();
    const app = hostApp(portal);
    expect((await request(app).get("/api/investors/health")).body).toEqual({ state: "ready" });
    const res = await request(app).get("/api/investors/no-such-path").set("Authorization", bearer(ADA.id));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("once ready, asks for a token before anything but /health (a JSON 401, not the site's page)", async () => {
    const { portal } = portalWith(COMPLETE, fakeAuthDeps());
    await portal.start();
    const res = await request(hostApp(portal)).get("/api/investors/no-such-path");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthenticated" });
  });
});

describe("start(): database and migrations (KP8, KP4)", () => {
  const dirs = [];
  afterAll(() => Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true }))));

  async function dirWith(files) {
    const dir = await mkdtemp(join(tmpdir(), "investors-portal-"));
    dirs.push(dir);
    await Promise.all(Object.entries(files).map(([name, sql]) => writeFile(join(dir, name), sql)));
    return dir;
  }

  it("opens the database from INVESTORS_DATABASE_URL and migrates it before 'ready'", async () => {
    const { portal, createDb } = portalWith(COMPLETE);
    await expect(portal.start()).resolves.toEqual({ state: "ready" });
    expect(createDb).toHaveBeenCalledWith(expect.objectContaining({ connectionString: COMPLETE.INVESTORS_DATABASE_URL }));
    const { rows } = await sharedDb.query("SELECT name FROM investors.schema_migrations WHERE name = $1", ["001_init.sql"]);
    expect(rows).toHaveLength(1);
  });

  it("does not open a database when config is missing", async () => {
    const { portal, createDb } = portalWith({});
    await portal.start();
    expect(createDb).not.toHaveBeenCalled();
  });

  it("a failed migration file disables the portal, logs the file, closes the pool; the site keeps serving", async () => {
    const migrationsDir = await dirWith({ "001_broken.sql": "SELECT no_such_column FROM investors.nowhere;" });
    const db = borrowedDb();
    const { portal, logger } = portalWith(COMPLETE, { migrationsDir, createDb: () => db });
    await expect(portal.start()).resolves.toEqual({ state: "disabled", reason: "migration_failed: 001_broken.sql" });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("001_broken.sql"));
    expect(db.end).toHaveBeenCalledTimes(1);
    const app = hostApp(portal);
    expect((await request(app).get("/api/investors/health")).body).toEqual({ state: "disabled" });
    const res = await request(app).get("/api/investors/me");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "portal_unavailable", state: "disabled" });
    expect((await request(app).get("/contact")).text).toBe("contact page");
  });

  it("an unreachable database disables the portal as 'bootstrap' and never logs the connection string", async () => {
    const unreachable = { ...borrowedDb(), tx: async () => Promise.reject(new Error("connect ECONNREFUSED 127.0.0.1:5432")) };
    const { portal, logger } = portalWith(COMPLETE, { createDb: () => unreachable });
    await expect(portal.start()).resolves.toEqual({ state: "disabled", reason: "migration_failed: bootstrap" });
    const logged = JSON.stringify([...logger.error.mock.calls, ...logger.warn.mock.calls]);
    expect(logged).toContain("ECONNREFUSED");
    expect(logged).not.toContain(COMPLETE.INVESTORS_DATABASE_URL);
    expect(logged).not.toContain("not-a-real-password");
  });

  it("a createDb that throws disables the portal instead of rejecting start()", async () => {
    const { portal } = portalWith(COMPLETE, {
      createDb: () => {
        throw new TypeError("Invalid URL");
      },
    });
    await expect(portal.start()).resolves.toMatchObject({ state: "disabled" });
  });
});
