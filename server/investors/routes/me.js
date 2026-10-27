/**
 * GET /me and PUT /me (US-005): who the signed-in investor is, and the
 * first-visit profile form. Mounted behind requireInvestor (KP3): the
 * investor is req.investor, from the verified token; nothing in the body
 * says who is saving, and the body cannot set the email, the completion
 * time or the blocked flag.
 */
import express from "express";
import { z } from "zod";
import { callAlert, NO_ALERTS } from "../alerts.js";
import { INVESTOR_COLUMNS, toInvestor } from "../auth.js";
import { perInvestorLimit } from "../rate-limit.js";
import {
  optionalChoice,
  optionalText,
  requiredBoolean,
  requiredChoice,
  requiredText,
  sendInvalid,
} from "../validation.js";

/** The CHECK lists of 001_init.sql, in the order the form shows them. */
export const INVESTOR_TYPES = Object.freeze(["vc", "angel", "family_office", "corporate", "accelerator", "other"]);
export const CHEQUE_SIZES = Object.freeze(["lt_50k", "50k_250k", "250k_1m", "gt_1m"]);
export const SOURCES = Object.freeze(["websummit", "intro", "website", "other"]);

export const PROFILE_LIMITS = Object.freeze({ name: 120, firm: 160, title: 120, country: 80, linkedinUrl: 300 });

/** PUT /me requests per investor per minute (KP16). */
export const SAVE_LIMIT_PER_MINUTE = 10;

const LINKEDIN_HOST = "linkedin.com";

/**
 * https://, on linkedin.com or one of its subdomains, with no credentials
 * and no port: an address an admin can safely click.
 * @param {string} value
 */
export function isLinkedInUrl(value) {
  if (!/^https:\/\//i.test(value)) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const host = url.hostname;
  const onLinkedIn = host === LINKEDIN_HOST || host.endsWith(`.${LINKEDIN_HOST}`);
  return url.protocol === "https:" && onLinkedIn && url.username === "" && url.password === "" && url.port === "";
}

/** Stored as the parsed URL's href, so the saved value is exactly what passed the check. */
const linkedinUrl = optionalText(PROFILE_LIMITS.linkedinUrl)
  .refine((value) => value === null || isLinkedInUrl(value), "linkedin_url")
  .transform((value) => (value === null ? null : new URL(value).href));

/** The form's fields (unknown keys are dropped). */
export const profileSchema = z.object({
  name: requiredText(PROFILE_LIMITS.name),
  firm: requiredText(PROFILE_LIMITS.firm),
  title: optionalText(PROFILE_LIMITS.title),
  investorType: requiredChoice(/** @type {[string, ...string[]]} */ (INVESTOR_TYPES)),
  chequeSize: optionalChoice(/** @type {[string, ...string[]]} */ (CHEQUE_SIZES)),
  linkedinUrl,
  country: optionalText(PROFILE_LIMITS.country),
  source: requiredChoice(/** @type {[string, ...string[]]} */ (SOURCES)),
  marketingOptIn: requiredBoolean(),
});

/** @typedef {z.infer<typeof profileSchema>} Profile */

// The first save only: a later or concurrent save finds profile_completed_at
// set (the row lock makes it wait, then re-check) and writes nothing.
const COMPLETE_PROFILE_SQL = `
  WITH completed AS (
    UPDATE investors.investors SET profile_completed_at = now()
     WHERE id = $1 AND profile_completed_at IS NULL
    RETURNING id
  ), logged AS (
    INSERT INTO investors.events (investor_id, type)
    SELECT id, 'profile_completed' FROM completed
  )
  SELECT id FROM completed`;

// SET expressions read the row as it was: marketing_opt_in_at is stamped
// only when the opt-in turns true, and kept as it was otherwise.
const SAVE_PROFILE_SQL = `
  UPDATE investors.investors
     SET name = $2, firm = $3, title = $4, investor_type = $5, cheque_size = $6,
         linkedin_url = $7, country = $8, source = $9,
         marketing_opt_in_at = CASE WHEN $10::boolean AND NOT marketing_opt_in THEN now() ELSE marketing_opt_in_at END,
         marketing_opt_in = $10::boolean
   WHERE id = $1
  RETURNING ${INVESTOR_COLUMNS}`;

/**
 * The /me answer: the investor without the Clerk user id.
 * @param {import("../auth.js").Investor} investor
 * @param {unknown} isAdmin
 */
function meBody(investor, isAdmin) {
  const { clerkUserId: _clerkUserId, ...visible } = investor;
  return { investor: visible, isAdmin: isAdmin === true, profileComplete: investor.profileCompletedAt != null };
}

/**
 * @param {import("../db.js").TxClient} client
 * @param {string} investorId
 * @param {Profile} profile
 * @returns {Promise<{row: Record<string, unknown> | null, firstSave: boolean}>}
 */
async function writeProfile(client, investorId, profile) {
  const completed = await client.query(COMPLETE_PROFILE_SQL, [investorId]);
  const saved = await client.query(SAVE_PROFILE_SQL, [
    investorId,
    profile.name,
    profile.firm,
    profile.title,
    profile.investorType,
    profile.chequeSize,
    profile.linkedinUrl,
    profile.country,
    profile.source,
    profile.marketingOptIn,
  ]);
  return { row: saved.rows[0] ?? null, firstSave: completed.rows.length > 0 };
}

/**
 * @param {{db: import("../db.js").Db, alerts: import("../alerts.js").Alerts, logger: import("../alerts.js").Logger}} deps
 * @returns {import("express").RequestHandler}
 */
function saveProfile({ db, alerts, logger }) {
  return async function putMe(req, res, next) {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    try {
      const { row, firstSave } = await db.tx((client) => writeProfile(client, req.investor.id, parsed.data));
      // Deleted by an admin since the guard read it.
      if (!row) return res.status(404).json({ error: "not_found" });
      const investor = toInvestor(row);
      if (firstSave) callAlert(logger, "signup", () => alerts.signup(investor));
      return res.json(meBody(investor, req.isAdmin));
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * @param {{db: import("../db.js").Db, alerts?: import("../alerts.js").Alerts,
 *   logger?: import("../alerts.js").Logger}} deps
 */
export function createMeRouter({ db, alerts = NO_ALERTS, logger = console }) {
  const router = express.Router();
  router.get("/me", (req, res) => res.json(meBody(req.investor, req.isAdmin)));
  router.put("/me", perInvestorLimit({ limit: SAVE_LIMIT_PER_MINUTE }), saveProfile({ db, alerts, logger }));
  return router;
}
