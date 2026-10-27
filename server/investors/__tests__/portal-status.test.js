import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";

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

function portalWith(env) {
  const logger = quietLogger();
  return { portal: createInvestorsPortal({ env, deps: { logger } }), logger };
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

  it("start() runs once: concurrent calls share one promise", () => {
    const { portal } = portalWith(COMPLETE);
    expect(portal.start()).toBe(portal.start());
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
    const { portal } = portalWith(COMPLETE);
    await portal.start();
    const app = hostApp(portal);
    expect((await request(app).get("/api/investors/health")).body).toEqual({ state: "ready" });
    const res = await request(app).get("/api/investors/no-such-path");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });
});
