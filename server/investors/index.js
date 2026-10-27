/**
 * Investor portal composition root (automatos.app/investors).
 *
 * server.js mounts apiRouter at /api/investors, before its global JSON
 * parser, and calls start() after app.listen. The portal is optional: with
 * config missing, and until start() has finished, every API path except
 * GET /health answers 503 {error:'portal_unavailable'} and the rest of the
 * site is untouched. The factory only wires things together and never
 * throws; start() never rejects.
 */
import express from "express";
import { readPortalConfig } from "./config.js";

/** @typedef {"disabled" | "starting" | "ready"} PortalState */
/** @typedef {{state: PortalState, reason?: string}} PortalStatus */
/** @typedef {{warn: (...args: unknown[]) => void, error: (...args: unknown[]) => void}} Logger */

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

/**
 * @param {{env?: Record<string, string | undefined>, deps?: {logger?: Logger}}} [options]
 */
export function createInvestorsPortal({ env = process.env, deps = {} } = {}) {
  const log = deps.logger ?? console;
  const config = readPortalConfig(env);
  let current = initialStatus(config);
  /** @type {Promise<Readonly<PortalStatus>> | null} */
  let starting = null;

  const status = () => current;

  async function boot() {
    if (current.state === "disabled") {
      log.warn(`[investors] portal disabled: ${current.reason}`);
      return current;
    }
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
