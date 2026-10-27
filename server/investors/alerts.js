/**
 * Admin alert emails (FR-12, US-017). The routes call these hooks once the
 * fact they report is committed: signup after an investor's first profile
 * save (routes/me.js), firstOpen after an investor's first open of an
 * alert-flagged document (routes/documents.js). Callers go through
 * callAlert(), which runs the hook after the response path, so a hook never
 * delays or fails the request that called it.
 *
 * Each alert is sent once: the hook first claims it in alerts_sent (INSERT
 * ... ON CONFLICT DO NOTHING on alerts_sent_once_idx), and only the claim
 * that inserted a row sends. A send that fails is logged and not retried,
 * so an admin never gets the same alert twice.
 *
 * The emails go out through the contact form's SMTP settings (config.js
 * alerts.smtp) to INVESTOR_ALERT_EMAILS. Without recipients or without
 * SMTP credentials the hooks are NO_ALERTS and alertsFromConfig says why.
 */
import { createTransport as createSmtpTransport } from "nodemailer";
import { firstOpenMessage, signupMessage } from "./alert-messages.js";

/** Where the emails link to (the admin investor page lives under it). */
export const ALERT_BASE_URL = "https://automatos.app";

/** The sender's display name; the address is SMTP_USER, as for the contact form. */
export const ALERT_FROM_NAME = "Automatos Investor Portal";

/**
 * @typedef {import("./auth.js").Investor} Investor
 * @typedef {object} Alerts
 * @property {(investor: Investor) => unknown} signup
 * @property {(investor: Investor, document: Readonly<Record<string, unknown>>) => unknown} firstOpen
 * @typedef {{error: (...args: unknown[]) => void}} Logger
 * @typedef {{sendMail: (message: Record<string, unknown>) => Promise<unknown>}} MailTransport
 * @typedef {(options: Record<string, unknown>) => MailTransport} TransportFactory nodemailer's createTransport
 * @typedef {string | {name: string, address: string}} MailAddress
 */

/** @type {Readonly<Alerts>} */
export const NO_ALERTS = Object.freeze({
  signup: () => undefined,
  firstOpen: () => undefined,
});

// Claims an alert: the first claim inserts and so sends; a repeat finds
// alerts_sent_once_idx taken and returns no row.
const CLAIM_SQL = `
  INSERT INTO investors.alerts_sent (investor_id, kind, document_id)
  VALUES ($1, $2, $3)
  ON CONFLICT DO NOTHING
  RETURNING investor_id`;

/** A driver's or mail server's error code ('EAUTH', '23503'): safe to log, unlike its message. */
const SAFE_CODE = /^[A-Za-z0-9_]{1,32}$/;

/** @param {unknown} err */
function errorLabel(err) {
  if (!(err instanceof Error)) return typeof err;
  const code = /** @type {{code?: unknown}} */ (err).code;
  return typeof code === "string" && SAFE_CODE.test(code) ? `${err.name} (${code})` : err.name;
}

/**
 * Runs a hook after the response path (setImmediate), so a slow or throwing
 * hook neither delays nor fails the response. A failure is logged by name
 * and code only: its message may quote an address, a mail server's reply or
 * the email itself.
 * @param {Logger} logger
 * @param {keyof Alerts} name
 * @param {() => unknown} run
 * @returns {Promise<void>} settles when the hook has; never rejects
 */
export function callAlert(logger, name, run) {
  return new Promise((resolve) => setImmediate(resolve))
    .then(run)
    .then(
      () => undefined,
      (err) => {
        logger.error(`[investors] alert '${name}' failed: ${errorLabel(err)}`);
      },
    );
}

/**
 * The two hooks, sending through `transport` to `to`. Each resolves true
 * when it sent, false when the alert had been sent before; it rejects when
 * the claim or the send fails (callAlert logs that).
 * @param {{db: import("./db.js").Db, transport: MailTransport, to: readonly string[], from: MailAddress,
 *   baseUrl?: string}} options
 * @returns {Readonly<Alerts>}
 */
export function createAlerts({ db, transport, to, from, baseUrl = ALERT_BASE_URL }) {
  const recipients = Object.freeze([...to]);

  /**
   * @param {readonly [string, "signup" | "first_open", string | null]} claim investor id, kind, document id
   * @param {() => Readonly<{subject: string, text: string, html: string}>} message
   */
  async function sendOnce(claim, message) {
    const { rowCount } = await db.query(CLAIM_SQL, [...claim]);
    if (rowCount === 0) return false;
    // Copies: nodemailer writes into the address objects it is given.
    const sender = typeof from === "string" ? from : { ...from };
    await transport.sendMail({ from: sender, to: [...recipients], ...message() });
    return true;
  }

  return Object.freeze({
    signup: (investor) => sendOnce([investor.id, "signup", null], () => signupMessage(investor, { baseUrl })),
    firstOpen: (investor, document) =>
      sendOnce([investor.id, "first_open", /** @type {string} */ (document.id)], () =>
        firstOpenMessage(investor, /** @type {{id: string, title: string}} */ (document), { baseUrl }),
      ),
  });
}

/** @param {string} reason */
const alertsOff = (reason) => Object.freeze({ alerts: NO_ALERTS, off: reason });

/**
 * The hooks the routes get: emails when there are recipients and SMTP
 * credentials, else NO_ALERTS and the reason (variable names only) for the
 * one warning start() logs. The transport is built here and connects only
 * when it sends.
 * @param {import("./config.js").PortalConfig["alerts"]} settings
 * @param {{db: import("./db.js").Db, createTransport?: TransportFactory}} deps
 * @returns {Readonly<{alerts: Readonly<Alerts>, off: string | null}>}
 */
export function alertsFromConfig(settings, { db, createTransport = createSmtpTransport }) {
  if (settings.to.length === 0) return alertsOff("INVESTOR_ALERT_EMAILS is empty");
  if (!settings.smtp) return alertsOff("SMTP_USER or SMTP_PASS is unset");
  const { host, port, user, pass } = settings.smtp;
  let transport;
  try {
    // The contact form's transport options (server.js).
    transport = createTransport({ host, port, secure: true, auth: { user, pass } });
  } catch (err) {
    // The portal's factory never throws (KP4): no transport, no alerts.
    return alertsOff(`the SMTP transport could not be built: ${errorLabel(err)}`);
  }
  const from = Object.freeze({ name: ALERT_FROM_NAME, address: user });
  return Object.freeze({ alerts: createAlerts({ db, transport, to: settings.to, from }), off: null });
}
