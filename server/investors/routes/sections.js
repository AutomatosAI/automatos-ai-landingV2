/**
 * Portal sections (US-009, US-016): the overview, team, FAQ and contact
 * pages, markdown the admins edit without a deploy. GET /sections gives an
 * investor the published ones; the /admin routes read every section and
 * save one. Mounted behind requireInvestor, and the /admin paths behind the
 * admin gate (KP3).
 *
 * The rows are seeded by 002_sections_seed.sql and, for the founder card's
 * signed-in-only rows, 005_founder_card_section.sql; there is no create or
 * delete, so a slug without a row is a 404. A save records the admin's Clerk
 * id (from the verified token) in updated_by. The markdown is stored as sent:
 * the app renders it without raw HTML.
 */
import express from "express";
import { z } from "zod";
import { FIELD_CODES, requiredBoolean, requiredText, sendInvalid } from "../validation.js";

export const SECTION_LIMITS = Object.freeze({
  title: 80,
  bodyMd: 20_000,
  /** The section_view slug's limit (routes/events.js EVENT_LIMITS.section). */
  slug: 60,
});

const ADMIN_SECTIONS_PATH = "/admin/sections";
const SLUG = new RegExp(`^[a-z0-9_-]{1,${SECTION_LIMITS.slug}}$`);

/** Control characters other than tab, line feed and carriage return: never in markdown (Postgres refuses NUL). */
const NON_TEXT_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const SECTION_COLUMNS = "slug, title, body_md, sort_order, published, updated_at, updated_by";
const ORDER = "ORDER BY sort_order, slug";

const PUBLISHED_SQL = `SELECT ${SECTION_COLUMNS} FROM investors.sections WHERE published ${ORDER}`;
const LIST_SQL = `SELECT ${SECTION_COLUMNS} FROM investors.sections ${ORDER}`;
const SELECT_SQL = `SELECT ${SECTION_COLUMNS} FROM investors.sections WHERE slug = $1`;

const SAVE_SQL = `
  UPDATE investors.sections
     SET title = $2, body_md = $3, published = $4, updated_at = now(), updated_by = $5
   WHERE slug = $1
  RETURNING ${SECTION_COLUMNS}`;

/** Markdown: many lines, 0 to bodyMd characters, kept exactly as sent. */
const markdown = z
  .string({ errorMap: (_issue, ctx) => ({ message: ctx.data === undefined ? FIELD_CODES.required : FIELD_CODES.invalid }) })
  .max(SECTION_LIMITS.bodyMd, FIELD_CODES.tooLong)
  .refine((value) => !NON_TEXT_CHARS.test(value), FIELD_CODES.invalid);

/** A save replaces all three fields (unknown keys, such as slug or updatedBy, are dropped). */
export const saveSchema = z.object({
  title: requiredText(SECTION_LIMITS.title),
  bodyMd: markdown,
  published: requiredBoolean(),
});

/**
 * What an investor reads.
 * @param {Record<string, any>} row a row of SECTION_COLUMNS
 */
export function toSection(row) {
  return Object.freeze({ slug: row.slug, title: row.title, bodyMd: row.body_md, updatedAt: row.updated_at });
}

/**
 * What an admin reads: the investor's fields plus the order, the published
 * flag and who saved it last.
 * @param {Record<string, any>} row a row of SECTION_COLUMNS
 */
export function toAdminSection(row) {
  return Object.freeze({
    ...toSection(row),
    sortOrder: row.sort_order,
    published: row.published,
    updatedBy: row.updated_by,
  });
}

/** @param {import("express").Response} res */
const notFound = (res) => res.status(404).json({ error: "not_found" });

/**
 * router.param("slug") handler: a slug no row could have is a 404 before
 * Postgres is asked.
 * @type {import("express").RequestParamHandler}
 */
function sectionSlugParam(_req, res, next, slug) {
  if (SLUG.test(slug)) return next();
  return notFound(res);
}

/** @typedef {{db: import("../db.js").Db}} Deps */

/** @param {Deps} deps @returns {import("express").RequestHandler} */
function listPublished({ db }) {
  return async function getSections(_req, res, next) {
    try {
      const { rows } = await db.query(PUBLISHED_SQL);
      return res.json({ sections: rows.map(toSection) });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Deps} deps @returns {import("express").RequestHandler} */
function listAll({ db }) {
  return async function getAdminSections(_req, res, next) {
    try {
      const { rows } = await db.query(LIST_SQL);
      return res.json({ sections: rows.map(toAdminSection) });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Deps} deps @returns {import("express").RequestHandler} */
function showOne({ db }) {
  return async function getAdminSection(req, res, next) {
    try {
      const { rows } = await db.query(SELECT_SQL, [req.params.slug]);
      if (rows.length === 0) return notFound(res);
      return res.json({ section: toAdminSection(rows[0]) });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Deps} deps @returns {import("express").RequestHandler} */
function saveOne({ db }) {
  return async function putAdminSection(req, res, next) {
    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    const { title, bodyMd, published } = parsed.data;
    try {
      const params = [req.params.slug, title, bodyMd, published, req.investor.clerkUserId];
      const { rows } = await db.query(SAVE_SQL, params);
      if (rows.length === 0) return notFound(res);
      return res.json({ section: toAdminSection(rows[0]) });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Deps} deps */
export function createSectionsRouter({ db }) {
  const router = express.Router();
  const deps = Object.freeze({ db });
  router.param("slug", sectionSlugParam);
  router.get("/sections", listPublished(deps));
  router.get(ADMIN_SECTIONS_PATH, listAll(deps));
  router.get(`${ADMIN_SECTIONS_PATH}/:slug`, showOne(deps));
  router.put(`${ADMIN_SECTIONS_PATH}/:slug`, saveOne(deps));
  return router;
}
