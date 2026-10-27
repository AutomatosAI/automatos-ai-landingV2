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
 * rejects.
 */
import express from "express";
import { readPortalConfig } from "./config.js";
import { createDb } from "./db.js";
import { MIGRATIONS_DIR, MigrationError, runMigrations } from "./migrate.js";

/** @typedef {"disabled" | "starting" | "ready"} PortalState */
/** @typedef {{state: PortalState, reason?: string}} PortalStatus */
/** @typedef {{warn: (...args: unknown[]) => void, error: (...args: unknown[]) => void}} Logger */
/**
 * @typedef {object} PortalDeps
 * @property {Logger} [logger]
 * @property {(options: {connectionString: string, logger: Logger}) => import("./db.js").Db} [createDb]
 * @property {string} [migrationsDir]
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
  return (_req, res, next) => {
    const { state } = getStatus();
    if (state === "ready") return next();
    return res.status(503).json({ error: "portal_unavailable", state });
  };
}

/** @param {() => Readonly<PortalStatus>} getStatus */
function createApiRouter(getStatus) {
  const router = express.Router();
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.get("/health", (_req, res) => res.json({ state: getStatus().state }));
  router.use(requireReady(getStatus));
  router.use((_req, res) => res.status(404).json({ error: "not_found" }));
  return router;
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
  });
  const log = resolved.logger;
  const config = readPortalConfig(env);
  let current = initialStatus(config);
  /** @type {Promise<Readonly<PortalStatus>> | null} */
  let starting = null;
  /** @type {import("./db.js").Db | null} set once ready; the routes of later stories read it */
  let database = null;

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
    apiRouter: createApiRouter(status),
    appRouter: express.Router(),
    /** Runs once; later calls return the same promise. */
    start: () => {
      starting = starting ?? boot();
      return starting;
    },
    status,
  });
}
