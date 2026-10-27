/**
 * Investor portal composition root (automatos.app/investors).
 *
 * server.js mounts apiRouter at /api/investors, before its global JSON
 * parser, and calls start() after app.listen. The portal is optional: with
 * config missing, and until start() has finished, every API path except
 * GET /health answers 503 {error:'portal_unavailable'} and the rest of the
 * site is untouched. start() opens the database and applies the migrations
 * (KP8); a failure there disables the portal, never the site (KP4). The
 * factory only wires things together and never throws; start() never
 * rejects. Once ready, every path but /health passes the investor guard
 * (auth.js) and every /admin path the admin gate (KP3); only then is a JSON
 * body (64 kB at most) read. Document storage (s3.js) is optional on top:
 * without the S3 config the document routes answer 503 and the rest of the
 * portal works.
 *
 * appRouter, mounted at /investors, serves the React app's build whatever
 * the API's state (static.js).
 */
import express from "express";
import { NO_ALERTS } from "./alerts.js";
import { createClerkVerifier, createUserLookup, requireAdmin, requireInvestor } from "./auth.js";
import { readPortalConfig } from "./config.js";
import { createDb } from "./db.js";
import { MIGRATIONS_DIR, MigrationError, runMigrations } from "./migrate.js";
import { createAdminDocumentsRouter } from "./routes/admin-documents.js";
import { createDocumentsRouter } from "./routes/documents.js";
import { createEventsRouter } from "./routes/events.js";
import { createMeRouter } from "./routes/me.js";
import { createDocStore } from "./s3.js";
import { APP_DIST_DIR, createAppRouter } from "./static.js";

/** @typedef {"disabled" | "starting" | "ready"} PortalState */
/** @typedef {{state: PortalState, reason?: string}} PortalStatus */
/** @typedef {{warn: (...args: unknown[]) => void, error: (...args: unknown[]) => void}} Logger */
/**
 * @typedef {object} PortalDeps
 * @property {Logger} [logger]
 * @property {(options: {connectionString: string, logger: Logger}) => import("./db.js").Db} [createDb]
 * @property {string} [migrationsDir]
 * @property {string} [appDistDir] the app's build (investors/dist)
 * @property {import("./auth.js").Verifier} [verifier] tests only: production verifies with Clerk
 * @property {import("./auth.js").UserLookup} [userLookup] tests only: production asks Clerk
 * @property {import("./alerts.js").Alerts} [alerts] the admin alert hooks (no-ops until W1-18)
 * @property {import("./s3.js").DocStore | null} [docStore] tests only: production builds it from config.s3
 */

/**
 * @param {PortalState} state
 * @param {string} [reason]
 * @returns {Readonly<PortalStatus>}
 */
function makeStatus(state, reason) {
  return Object.freeze(reason ? { state, reason } : { state });
}

/**
 * Disabled when a required variable is unset; the reason names the
 * variables, never their values.
 * @param {import("./config.js").PortalConfig} config
 */
function initialStatus(config) {
  if (config.missing.length > 0) {
    return makeStatus("disabled", `missing_config: ${config.missing.join(", ")}`);
  }
  return makeStatus("starting");
}

/** @param {() => Readonly<PortalStatus>} getStatus */
function requireReady(getStatus) {
  return function readyGate(_req, res, next) {
    const { state } = getStatus();
    if (state === "ready") return next();
    return res.status(503).json({ error: "portal_unavailable", state });
  };
}

/** @type {import("express").RequestHandler} */
function noStore(_req, res, next) {
  res.set("Cache-Control", "no-store");
  next();
}

const MAX_LOGGED_MESSAGE = 300;

/**
 * An error message fit for one log line: control characters (a forged line
 * break) replaced, and cut short.
 * @param {unknown} err
 */
function logLine(err) {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return message.replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, MAX_LOGGED_MESSAGE);
}

/**
 * Last in the router: a JSON error, never a stack trace (KP15). Client errors
 * keep their status; anything else is logged with the path (no query string)
 * and answered 500.
 * @param {Logger} logger
 * @returns {import("express").ErrorRequestHandler}
 */
function portalErrors(logger) {
  return function portalError(err, req, res, next) {
    if (res.headersSent) return next(err);
    const status = Number(err?.status);
    if (status >= 400 && status < 500) return res.status(status).json({ error: "bad_request" });
    logger.error(`[investors] ${req.method} ${req.baseUrl}${req.path} failed: ${logLine(err)}`);
    return res.status(500).json({ error: "internal_error" });
  };
}

/** Portal bodies are small (KP16); a bigger one is a 413 before any route sees it. */
const BODY_LIMIT = "64kb";

/**
 * Route order is the security model (KP3): GET /health is the only route
 * before the investor guard, and the admin gate sits on /admin before any
 * admin route. Bodies are parsed only after the guard. Later stories add
 * their routers to `routes`, which sit between the admin gate and the 404;
 * __tests__/route-coverage.test.js walks this stack to prove it.
 * @param {() => Readonly<PortalStatus>} getStatus
 * @param {{investorGuard: import("express").RequestHandler, routes: readonly import("express").Router[],
 *   logger: Logger}} parts
 */
function createApiRouter(getStatus, { investorGuard, routes, logger }) {
  const router = express.Router();
  router.use(noStore);
  router.get("/health", (_req, res) => res.json({ state: getStatus().state }));
  router.use(requireReady(getStatus));
  router.use(investorGuard);
  router.use(express.json({ limit: BODY_LIMIT }));
  router.use("/admin", requireAdmin);
  for (const routeSet of routes) router.use(routeSet);
  router.use((_req, res) => res.status(404).json({ error: "not_found" }));
  router.use(portalErrors(logger));
  return router;
}

/** Disabled for want of the secret key: the guard is never reached (503), and refuses if it were. */
const refuse = async () => {
  throw new Error("the portal has no Clerk secret key");
};

/**
 * @param {import("./config.js").PortalConfig} config
 * @param {PortalDeps} deps
 */
function authDeps(config, deps) {
  const { secretKey, authorizedParties } = config.clerk;
  return {
    verifier: deps.verifier ?? (secretKey ? createClerkVerifier({ secretKey, authorizedParties }) : refuse),
    userLookup: deps.userLookup ?? (secretKey ? createUserLookup({ secretKey }) : refuse),
  };
}

/**
 * The document store, or null without the S3 config (the document routes
 * then answer 503). Building it opens nothing: the S3 client is lazy.
 * @param {import("./config.js").PortalConfig} config
 * @param {PortalDeps} deps
 * @returns {import("./s3.js").DocStore | null}
 */
function docStoreFor(config, deps) {
  if (deps.docStore !== undefined) return deps.docStore;
  return config.s3 ? createDocStore({ config: config.s3 }) : null;
}

/**
 * The route sets createApiRouter mounts behind the guards, in order. Later
 * stories append theirs here. The admin and investor document routes share
 * one store (one lazy S3 client).
 * @param {import("./config.js").PortalConfig} config
 * @param {PortalDeps} deps
 * @param {{db: import("./db.js").Db, logger: Logger}} shared
 */
function createRoutes(config, deps, { db, logger }) {
  const alerts = deps.alerts ?? NO_ALERTS;
  const store = docStoreFor(config, deps);
  return Object.freeze([
    createMeRouter({ db, alerts, logger }),
    createAdminDocumentsRouter({ db, store, logger }),
    createDocumentsRouter({ db, store, alerts, logger }),
    createEventsRouter({ db }),
  ]);
}

/**
 * The routers exist before the database does; the ready gate guarantees
 * start() has set it before any guarded route asks.
 * @param {() => import("./db.js").Db | null} current
 * @returns {import("./db.js").Db}
 */
function lateBoundDb(current) {
  const open = () => {
    const db = current();
    if (!db) throw new Error("the investors database is not open");
    return db;
  };
  return Object.freeze({
    query: (text, params) => open().query(text, params),
    tx: (fn) => open().tx(fn),
    end: () => open().end(),
  });
}

/** @param {unknown} err */
function migrationStep(err) {
  return err instanceof MigrationError ? err.file : "unknown";
}

/**
 * Opens the database and migrates it. On failure it logs the step (a file
 * name, never the connection string), closes the pool and names the step.
 * @param {import("./config.js").PortalConfig} config
 * @param {Required<PortalDeps>} deps
 * @returns {Promise<{db: import("./db.js").Db} | {failedStep: string}>}
 */
async function openDatabase(config, deps) {
  /** @type {import("./db.js").Db | null} */
  let db = null;
  try {
    db = deps.createDb({ connectionString: config.db.url, logger: deps.logger });
    const applied = await runMigrations(db, deps.migrationsDir);
    if (applied.length > 0) deps.logger.warn(`[investors] migrations applied: ${applied.join(", ")}`);
    return { db };
  } catch (err) {
    // Only the message: a MigrationError's names the file; the error object may hold the URL.
    deps.logger.error(`[investors] portal disabled: ${err instanceof Error ? err.message : String(err)}`);
    const step = migrationStep(err);
    await db?.end().catch((endErr) => deps.logger.error(`[investors] closing the pool failed: ${endErr.message}`));
    return { failedStep: step };
  }
}

/**
 * @param {{env?: Record<string, string | undefined>, deps?: PortalDeps}} [options]
 */
export function createInvestorsPortal({ env = process.env, deps = {} } = {}) {
  /** @type {Required<PortalDeps>} */
  const resolved = Object.freeze({
    logger: deps.logger ?? console,
    createDb: deps.createDb ?? createDb,
    migrationsDir: deps.migrationsDir ?? MIGRATIONS_DIR,
    appDistDir: deps.appDistDir ?? APP_DIST_DIR,
  });
  const log = resolved.logger;
  const config = readPortalConfig(env);
  let current = initialStatus(config);
  /** @type {Promise<Readonly<PortalStatus>> | null} */
  let starting = null;
  /** @type {import("./db.js").Db | null} set once ready; routes reach it through `db` */
  let database = null;
  const db = lateBoundDb(() => database);
  const investorGuard = requireInvestor({ ...authDeps(config, deps), db, admins: config.admins, logger: log });
  const routes = createRoutes(config, deps, { db, logger: log });

  const status = () => current;

  async function boot() {
    if (current.state === "disabled") {
      log.warn(`[investors] portal disabled: ${current.reason}`);
      return current;
    }
    const opened = await openDatabase(config, resolved);
    if ("failedStep" in opened) {
      current = makeStatus("disabled", `migration_failed: ${opened.failedStep}`);
      return current;
    }
    database = opened.db;
    current = makeStatus("ready");
    return current;
  }

  return Object.freeze({
    apiRouter: createApiRouter(status, { investorGuard, routes, logger: log }),
    appRouter: createAppRouter({ distDir: resolved.appDistDir, logger: log }),
    /** Runs once; later calls return the same promise. */
    start: () => {
      starting = starting ?? boot();
      return starting;
    },
    status,
  });
}
