/**
 * Admin alert hooks (FR-12). The routes call these once the fact they report
 * is committed: signup after an investor's first profile save (routes/me.js),
 * firstOpen after an investor's first open of an alert-flagged document. A
 * hook never fails the request that called it: callers go through
 * callAlert(). Until the emails exist (W1-18) both hooks do nothing.
 */

/**
 * @typedef {import("./auth.js").Investor} Investor
 * @typedef {object} Alerts
 * @property {(investor: Investor) => unknown} signup
 * @property {(investor: Investor, document: Readonly<Record<string, unknown>>) => unknown} firstOpen
 * @typedef {{error: (...args: unknown[]) => void}} Logger
 */

/** @type {Readonly<Alerts>} */
export const NO_ALERTS = Object.freeze({
  signup: () => undefined,
  firstOpen: () => undefined,
});

/**
 * Runs a hook after the current call stack, so a slow or throwing hook
 * neither delays nor fails the response. A failure is logged by name only:
 * its message may quote an address or a mail server's reply.
 * @param {Logger} logger
 * @param {keyof Alerts} name
 * @param {() => unknown} run
 * @returns {Promise<void>} settles when the hook has; never rejects
 */
export function callAlert(logger, name, run) {
  return Promise.resolve()
    .then(run)
    .then(
      () => undefined,
      (err) => {
        const label = err instanceof Error ? err.name : typeof err;
        logger.error(`[investors] alert '${name}' failed: ${label}`);
      },
    );
}
