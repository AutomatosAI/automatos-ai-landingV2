import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import { createAppRouter } from "../static.js";

const INDEX_HTML = "<!doctype html><title>Investors · Automatos</title><div id=root></div>";
const ASSET = "index-abc123.js";
const ASSET_BODY = "export const app = 1;";
/** A file beside dist: a path that escaped dist would reach it. */
const SENTINEL = "server-source-must-not-leak";

function quietLogger() {
  return { warn: vi.fn(), error: vi.fn() };
}

/** A host app shaped like server.js: the app at /investors, then the site. */
function hostApp(appRouter) {
  const app = express();
  app.use("/investors", appRouter);
  app.get("/contact", (_req, res) => res.send("contact page"));
  app.use((_req, res) => res.status(404).send("site 404"));
  return app;
}

/** @type {string} */
let root;
/** @type {string} */
let distDir;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "investors-static-"));
  distDir = join(root, "dist");
  await mkdir(join(distDir, "assets"), { recursive: true });
  await writeFile(join(distDir, "index.html"), INDEX_HTML);
  await writeFile(join(distDir, "assets", ASSET), ASSET_BODY);
  await writeFile(join(root, "server.js"), SENTINEL);
});
afterAll(() => rm(root, { recursive: true, force: true }));

describe("appRouter: the built app", () => {
  const app = () => hostApp(createAppRouter({ distDir, logger: quietLogger() }));

  it.each(["/investors", "/investors/", "/investors/admin/x", "/investors/documents/42"])(
    "%s serves index.html, never cached",
    async (path) => {
      const res = await request(app()).get(path);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/^text\/html/);
      expect(res.headers["cache-control"]).toBe("no-store");
      expect(res.text).toBe(INDEX_HTML);
    },
  );

  it("serves a built asset with a year's immutable cache", async () => {
    const res = await request(app()).get(`/investors/assets/${ASSET}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/javascript/);
    expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(res.text).toBe(ASSET_BODY);
  });

  it("answers a missing asset 404, not index.html", async () => {
    const res = await request(app()).get("/investors/assets/missing.js");
    expect(res.status).toBe(404);
    expect(res.text).not.toContain(INDEX_HTML);
  });

  it.each([
    "/investors/../server.js",
    "/investors/%2e%2e/server.js",
    "/investors/..%2fserver.js",
    "/investors/assets/../../server.js",
    "/investors/assets/..%2f..%2fserver.js",
    "/investors/assets/%2e%2e%5c%2e%2e%5cserver.js",
    "/investors/%E0%A4%A",
  ])("%s does not escape dist (400)", async (path) => {
    const res = await request(app()).get(path);
    expect(res.status).toBe(400);
    expect(res.text).not.toContain(SENTINEL);
  });

  it("claims nothing outside /investors", async () => {
    for (const path of ["/investors-x", "/investors.html", "/assets/" + ASSET]) {
      const res = await request(app()).get(path);
      expect(res.status, path).toBe(404);
      expect(res.text, path).toBe("site 404");
    }
    expect((await request(app()).get("/contact")).text).toBe("contact page");
  });

  it("leaves other methods to the site", async () => {
    const res = await request(app()).post("/investors");
    expect(res.status).toBe(404);
    expect(res.text).toBe("site 404");
  });
});

describe("appRouter: no build", () => {
  it("answers 503 with one line of HTML, logging once", async () => {
    const logger = quietLogger();
    const app = hostApp(createAppRouter({ distDir: join(root, "no-dist"), logger }));
    for (const path of ["/investors", "/investors/admin/x"]) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(503);
      expect(res.headers["content-type"]).toMatch(/^text\/html/);
      expect(res.headers["cache-control"]).toBe("no-store");
      expect(res.text).toContain("The investor portal is temporarily unavailable");
      expect(res.text).toContain('href="/contact"');
      expect(res.text.split("\n")).toHaveLength(1);
    }
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain("/investors answers 503");
  });

  it("keeps a missing asset a 404", async () => {
    const app = hostApp(createAppRouter({ distDir: join(root, "no-dist"), logger: quietLogger() }));
    expect((await request(app).get(`/investors/assets/${ASSET}`)).status).toBe(404);
  });
});

describe("createInvestorsPortal: appRouter", () => {
  it("serves the app while the API is disabled (KP4)", async () => {
    const portal = createInvestorsPortal({ env: {}, deps: { logger: quietLogger(), appDistDir: distDir } });
    expect(portal.status().state).toBe("disabled");
    const app = express();
    app.use("/api/investors", portal.apiRouter);
    app.use("/investors", portal.appRouter);
    const page = await request(app).get("/investors/documents");
    expect(page.status).toBe(200);
    expect(page.text).toBe(INDEX_HTML);
    const api = await request(app).get("/api/investors/me");
    expect(api.status).toBe(503);
    expect(api.body).toEqual({ error: "portal_unavailable", state: "disabled" });
  });
});
