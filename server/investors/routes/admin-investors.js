/**
 * Admin investors (US-012, US-013): the paged, searchable list with each
 * investor's engagement, one investor's profile and per-document summary,
 * their timeline, block and unblock, delete, and the GDPR export. Mounted
 * behind requireInvestor and the /admin gate (KP3). The SQL and the answer
 * shapes are in queries/; everything is aggregated there, in Postgres.
 *
 * A blocked investor is refused by the guard on their next request (403
 * blocked). Delete removes the row and, through the cascading foreign keys,
 * their sessions, events and alert records; the Clerk account is not
 * touched (a new sign-in starts a new, empty row). An admin cannot block
 * themselves: the guard would then refuse them the admin screens too.
 */
import express from "express";
import { z } from "zod";
import { toInvestor } from "../auth.js";
import { documentIdParam } from "../documents.js";
import {
  BLOCK_SQL,
  DELETE_SQL,
  EVENT_COUNT_SQL,
  EXPORT_EVENTS_SQL,
  EXPORT_SESSIONS_SQL,
  INVESTOR_SQL,
  SUMMARY_SQL,
  TIMELINE_SQL,
  toDocumentSummary,
  toEvent,
  toSession,
} from "../queries/investor-detail.js";
import {
  COUNT_SQL,
  DEFAULT_DIRECTION,
  DEFAULT_SORT,
  PAGE_SIZE,
  SORT_DIRECTIONS,
  SORT_KEYS,
  listParams,
  pageSql,
  toListRow,
} from "../queries/investor-list.js";
import { FIELD_CODES, optionalChoice, optionalText, requiredBoolean, sendInvalid } from "../validation.js";
import { INVESTOR_TYPES, SOURCES } from "./me.js";

export const LIST_LIMITS = Object.freeze({ q: 200, page: 999_999 });

const INVESTORS_PATH = "/admin/investors";
const INVESTOR_PATH = `${INVESTORS_PATH}/:id`;

/** @param {readonly string[]} values */
const choice = (values) => optionalChoice(/** @type {[string, ...string[]]} */ (values));

/** ?page=N: a whole number from 1; missing is 1. */
const pageNumber = z
  .string({ errorMap: () => ({ message: FIELD_CODES.invalid }) })
  .regex(/^[1-9]\d*$/, FIELD_CODES.invalid)
  .transform(Number)
  .refine((page) => page <= LIST_LIMITS.page, FIELD_CODES.invalid)
  .optional()
  .transform((page) => page ?? 1);

/** The list's query string; a blank value is the default, unknown keys are dropped. */
export const listQuerySchema = z.object({
  q: optionalText(LIST_LIMITS.q),
  type: choice(INVESTOR_TYPES),
  source: choice(SOURCES),
  sort: choice(SORT_KEYS).transform((sort) => sort ?? DEFAULT_SORT),
  dir: choice(SORT_DIRECTIONS).transform((dir) => dir ?? DEFAULT_DIRECTION),
  page: pageNumber,
});

const timelineQuerySchema = z.object({ page: pageNumber });

const blockSchema = z.object({ blocked: requiredBoolean() });

/** @typedef {{db: import("../db.js").Db, logger: import("../alerts.js").Logger}} Deps */

/** @param {import("express").Response} res */
const notFound = (res) => res.status(404).json({ error: "not_found" });

/** @param {Pick<Deps, "db">} deps @returns {import("express").RequestHandler} */
function listInvestors({ db }) {
  return async function getInvestors(req, res, next) {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    const { sort, dir, page } = parsed.data;
    const params = listParams(parsed.data);
    try {
      const counted = await db.query(COUNT_SQL, params.count);
      const found = await db.query(pageSql(sort, dir), params.page);
      const investors = found.rows.map(toListRow);
      return res.json({ investors, total: counted.rows[0].total, page, pageSize: PAGE_SIZE });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Pick<Deps, "db">} deps @returns {import("express").RequestHandler} */
function showInvestor({ db }) {
  return async function getInvestor(req, res, next) {
    try {
      const { rows } = await db.query(INVESTOR_SQL, [req.params.id]);
      if (rows.length === 0) return notFound(res);
      const summary = await db.query(SUMMARY_SQL, [req.params.id]);
      return res.json({ investor: toInvestor(rows[0]), documents: summary.rows.map(toDocumentSummary) });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Pick<Deps, "db">} deps @returns {import("express").RequestHandler} */
function showTimeline({ db }) {
  return async function getTimeline(req, res, next) {
    const parsed = timelineQuerySchema.safeParse(req.query);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    const { page } = parsed.data;
    try {
      const counted = await db.query(EVENT_COUNT_SQL, [req.params.id]);
      if (counted.rows.length === 0) return notFound(res);
      const { rows } = await db.query(TIMELINE_SQL, [req.params.id, PAGE_SIZE, (page - 1) * PAGE_SIZE]);
      return res.json({ events: rows.map(toEvent), total: counted.rows[0].total, page, pageSize: PAGE_SIZE });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Deps} deps @returns {import("express").RequestHandler} */
function setBlocked({ db, logger }) {
  return async function patchInvestor(req, res, next) {
    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    const { blocked } = parsed.data;
    const isSelf = req.params.id.toLowerCase() === req.investor.id;
    if (blocked && isSelf) return res.status(409).json({ error: "cannot_block_self" });
    try {
      const { rows } = await db.query(BLOCK_SQL, [req.params.id, blocked]);
      if (rows.length === 0) return notFound(res);
      logger.warn(`[investors] admin ${req.investor.id} ${blocked ? "blocked" : "unblocked"} investor ${req.params.id}`);
      return res.json({ investor: toInvestor(rows[0]) });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Deps} deps @returns {import("express").RequestHandler} */
function deleteInvestor({ db, logger }) {
  return async function deleteOne(req, res, next) {
    try {
      const { rowCount } = await db.query(DELETE_SQL, [req.params.id]);
      if (rowCount === 0) return notFound(res);
      logger.warn(`[investors] admin ${req.investor.id} deleted investor ${req.params.id}`);
      return res.status(204).end();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Everything the portal holds about one investor, for an access request.
 * @param {import("../db.js").Db} db
 * @param {string} id
 */
async function exportOf(db, id) {
  const { rows } = await db.query(INVESTOR_SQL, [id]);
  if (rows.length === 0) return null;
  const sessions = await db.query(EXPORT_SESSIONS_SQL, [id]);
  const events = await db.query(EXPORT_EVENTS_SQL, [id]);
  return {
    exportedAt: new Date().toISOString(),
    investor: toInvestor(rows[0]),
    sessions: sessions.rows.map(toSession),
    events: events.rows.map(toEvent),
  };
}

/** @param {Pick<Deps, "db">} deps @returns {import("express").RequestHandler} */
function exportInvestor({ db }) {
  return async function getExport(req, res, next) {
    try {
      const body = await exportOf(db, req.params.id);
      if (!body) return notFound(res);
      // The id is a checked uuid (documentIdParam), so the file name needs no escaping.
      res.attachment(`investor-${req.params.id}.json`);
      return res.json(body);
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {{db: import("../db.js").Db, logger?: import("../alerts.js").Logger}} deps */
export function createAdminInvestorsRouter({ db, logger = console }) {
  const router = express.Router();
  const deps = Object.freeze({ db, logger });
  // Any id that is not a uuid is no such investor (the check is the documents' one).
  router.param("id", documentIdParam);
  router.get(INVESTORS_PATH, listInvestors(deps));
  router.get(INVESTOR_PATH, showInvestor(deps));
  router.get(`${INVESTOR_PATH}/events`, showTimeline(deps));
  router.get(`${INVESTOR_PATH}/export`, exportInvestor(deps));
  router.patch(INVESTOR_PATH, setBlocked(deps));
  router.delete(INVESTOR_PATH, deleteInvestor(deps));
  return router;
}
