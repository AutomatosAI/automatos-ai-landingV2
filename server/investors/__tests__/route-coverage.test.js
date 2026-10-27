/**
 * KP3 guard for every story: walks apiRouter's stack and fails if any route
 * other than GET /health is reachable without the investor guard, or any
 * /admin path without the admin gate. Then it asks the running router: every
 * route it found answers 401 without a token, and every /admin route 403 to
 * a signed-in non-admin.
 */
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GUARD, requireAdmin } from "../auth.js";
import { createInvestorsPortal } from "../index.js";
import { ADA, ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { createTestDb } from "./helpers/test-db.js";

/** Guards are known by auth.js's GUARD tag, so a look-alike function name proves nothing. */
const INVESTOR_GUARD = "investor";
const ADMIN_GATE = "admin";
const guardOf = (fn) => fn?.[GUARD];
/** The only middleware allowed before the investor guard: neither serves data. */
const BEFORE_GUARD = new Set(["noStore", "readyGate"]);
const PUBLIC_ROUTES = new Set(["GET /health"]);
const SAMPLE_ID = "00000000-0000-4000-8000-000000000000";

const ENV = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
  INVESTOR_ADMIN_CLERK_IDS: ADMIN.id,
});

/**
 * Express 4 keeps a mount path only as a regexp: '/admin' is ^\/admin\/?(?=\/|$).
 * @param {any} layer
 */
function mountPath(layer) {
  if (layer.regexp.fast_slash) return "";
  const match = /^\^(.*)\\\/\?\(\?=\\\/\|\$\)$/.exec(layer.regexp.source);
  if (!match || /[()*+?[\]:]/.test(match[1].replace(/\\\//g, ""))) {
    throw new Error(`cannot read the mount path of layer '${layer.name}' (${layer.regexp}): mount at a plain path`);
  }
  return match[1].replace(/\\\//g, "/");
}

const underPrefix = (prefix, path) => prefix === "" || path.toLowerCase() === prefix || path.toLowerCase().startsWith(`${prefix}/`);
const isAdminPath = (path) => underPrefix("/admin", path);

/**
 * Flattens a router into what a request meets, in order: routes, plain
 * middleware and nested routers (recursed), with the guards in force at
 * each point. Error handlers run only after an error and are skipped.
 * @param {any[]} stack
 * @param {{prefix: string, guarded: boolean, adminPrefixes: string[]}} scope
 */
function walk(stack, scope = { prefix: "", guarded: false, adminPrefixes: [] }) {
  const entries = [];
  let state = scope;
  for (const layer of stack) {
    if (layer.route) {
      const tags = layer.route.stack.map((inner) => guardOf(inner.handle)).slice(0, -1);
      const path = state.prefix + layer.route.path;
      entries.push({
        kind: "route",
        path,
        methods: Object.keys(layer.route.methods).filter((method) => method !== "_all"),
        guarded: state.guarded || tags.includes(INVESTOR_GUARD),
        adminGated: state.adminPrefixes.some((prefix) => underPrefix(prefix, path)) || tags.includes(ADMIN_GATE),
      });
      continue;
    }
    if (layer.handle.length === 4) continue;
    const path = state.prefix + mountPath(layer);
    if (Array.isArray(layer.handle.stack)) {
      entries.push(...walk(layer.handle.stack, { ...state, prefix: path }));
    } else if (guardOf(layer.handle) === INVESTOR_GUARD && path === state.prefix) {
      state = { ...state, guarded: true };
    } else if (guardOf(layer.handle) === ADMIN_GATE && state.guarded) {
      state = { ...state, adminPrefixes: [...state.adminPrefixes, path.toLowerCase()] };
    } else {
      const adminGated = state.adminPrefixes.some((prefix) => underPrefix(prefix, path));
      entries.push({ kind: "middleware", name: layer.name, path, guarded: state.guarded, adminGated });
    }
  }
  return entries;
}

/** @param {ReturnType<typeof walk>} entries @returns {string[]} */
function violations(entries) {
  const found = [];
  for (const entry of entries) {
    const label = entry.kind === "route" ? `${entry.methods.join(",").toUpperCase()} ${entry.path}` : `middleware '${entry.name}' at '${entry.path}'`;
    const isPublic = entry.kind === "route" && entry.methods.every((method) => PUBLIC_ROUTES.has(`${method.toUpperCase()} ${entry.path}`));
    const allowedBefore = entry.kind === "middleware" && entry.path === "" && BEFORE_GUARD.has(entry.name);
    if (!entry.guarded && !isPublic && !allowedBefore) found.push(`${label} is reachable without the investor guard`);
    if (isAdminPath(entry.path) && !entry.adminGated) found.push(`${label} is reachable without the admin gate`);
    if (entry.guarded && isPublic) found.push(`${label} is public but sits behind the investor guard`);
  }
  return found;
}

const routesOf = (entries) => entries.filter((entry) => entry.kind === "route" && !PUBLIC_ROUTES.has(`GET ${entry.path}`));
const samplePath = (path) => `/api/investors${path.replace(/:[A-Za-z0-9_]+\??/g, SAMPLE_ID)}`;

/** @type {import("../db.js").Db} */
let db;
let portal;
let app;
beforeAll(async () => {
  db = await createTestDb();
  portal = createInvestorsPortal({
    env: ENV,
    deps: { logger: { warn: vi.fn(), error: vi.fn() }, createDb: () => db, ...fakeAuthDeps() },
  });
  await portal.start();
  app = express().use("/api/investors", portal.apiRouter);
});
afterAll(() => db.end());

describe("route coverage: the walker catches what it guards against", () => {
  const guard = Object.assign((_req, _res, next) => next(), { [GUARD]: "investor" });
  const handler = (_req, res) => res.json({});

  it("flags a route mounted before the guard, an /admin route before the gate and stray pre-guard middleware", () => {
    const admin = express.Router();
    admin.get("/secrets", handler);
    const router = express.Router();
    router.get("/health", handler);
    router.get("/early", handler);
    router.use(function leaky(_req, res) {
      res.json({});
    });
    router.use(guard);
    router.get("/admin/overview", handler);
    router.use("/admin", admin);
    router.use("/admin", requireAdmin);
    router.get("/admin/late", handler);
    expect(violations(walk(router.stack))).toEqual([
      "GET /early is reachable without the investor guard",
      "middleware 'leaky' at '' is reachable without the investor guard",
      "GET /admin/overview is reachable without the admin gate",
      "GET /admin/secrets is reachable without the admin gate",
    ]);
  });

  it("is not fooled by look-alike guards that only borrow the names", () => {
    const router = express.Router();
    router.use(function investorGuard(_req, _res, next) {
      next();
    });
    router.use("/admin", function requireAdmin(_req, _res, next) {
      next();
    });
    router.get("/admin/overview", handler);
    expect(violations(walk(router.stack))).toEqual([
      "middleware 'investorGuard' at '' is reachable without the investor guard",
      "middleware 'requireAdmin' at '/admin' is reachable without the investor guard",
      "middleware 'requireAdmin' at '/admin' is reachable without the admin gate",
      "GET /admin/overview is reachable without the investor guard",
      "GET /admin/overview is reachable without the admin gate",
    ]);
  });

  it("accepts a guard inside a nested router or on the route itself", () => {
    const nested = express.Router();
    nested.use(guard);
    nested.get("/me", handler);
    const router = express.Router();
    router.get("/health", handler);
    router.use(nested);
    router.get("/admin/one", guard, requireAdmin, handler);
    expect(violations(walk(router.stack))).toEqual([]);
  });

  it("refuses to guess a mount path it cannot read", () => {
    const router = express.Router();
    router.use("/admin/:id", requireAdmin);
    expect(() => walk(router.stack)).toThrow(/mount at a plain path/);
  });
});

describe("route coverage: the portal's apiRouter (KP3)", () => {
  it("has the investor guard and, after it, the admin gate on /admin", () => {
    const guards = portal.apiRouter.stack.map((layer) => guardOf(layer.handle));
    expect(guards).toContain(INVESTOR_GUARD);
    expect(guards.indexOf(ADMIN_GATE)).toBeGreaterThan(guards.indexOf(INVESTOR_GUARD));
    expect(mountPath(portal.apiRouter.stack[guards.indexOf(ADMIN_GATE)])).toBe("/admin");
  });

  it("reaches no route but GET /health without the guard, and no /admin path without the gate", () => {
    expect(violations(walk(portal.apiRouter.stack))).toEqual([]);
  });

  it("answers 401 without a token on every route it serves, and on unknown paths", async () => {
    const probes = [
      ...routesOf(walk(portal.apiRouter.stack)).flatMap((entry) => entry.methods.map((method) => [method, entry.path])),
      ["get", "/me"],
      ["post", "/events"],
      ["get", "/no-such-path"],
      ["get", "/admin/overview"],
      ["delete", `/admin/investors/${SAMPLE_ID}`],
    ];
    for (const [method, path] of probes) {
      const res = await request(app)[method](samplePath(path));
      expect({ method, path, status: res.status, body: res.body }).toEqual({ method, path, status: 401, body: { error: "unauthenticated" } });
    }
  });

  it("answers 403 forbidden to a signed-in non-admin on every /admin route and path, in any letter case", async () => {
    const adminRoutes = routesOf(walk(portal.apiRouter.stack)).filter((entry) => isAdminPath(entry.path));
    const probes = [
      ...adminRoutes.flatMap((entry) => entry.methods.map((method) => [method, entry.path])),
      ["get", "/admin"],
      ["get", "/admin/overview"],
      ["get", "/ADMIN/overview"],
      ["patch", `/admin/investors/${SAMPLE_ID}`],
    ];
    for (const [method, path] of probes) {
      const res = await request(app)[method](samplePath(path)).set("Authorization", bearer(ADA.id));
      expect({ method, path, status: res.status }).toEqual({ method, path, status: 403 });
    }
  });

  it("lets an admin past the gate (an unknown /admin path is then a JSON 404)", async () => {
    const res = await request(app).get("/api/investors/admin/no-such-path").set("Authorization", bearer(ADMIN.id));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("keeps GET /health public", async () => {
    const res = await request(app).get("/api/investors/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ state: "ready" });
  });
});
