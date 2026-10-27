/**
 * Investor documents (US-006): the published library, and a short-lived link
 * to open or download one file. Mounted behind requireInvestor (KP3): the
 * investor is req.investor, from the verified token. An unpublished, missing
 * or file-less document is a 404, whatever the id.
 *
 * Issuing a link is what the server records (KP16): document_open for
 * inline, document_download for download, with the version the link serves.
 * The event and the presigned GET (5 minutes, KP11) happen in one
 * transaction, so a link is never handed out unrecorded and a failed presign
 * records nothing. An investor's first open of an alert-flagged document
 * calls the firstOpen alert hook once that transaction has committed.
 *
 * Without the S3 config every route here answers 503
 * {error:'storage_unavailable'} (KP4).
 */
import express from "express";
import { z } from "zod";
import { callAlert, NO_ALERTS } from "../alerts.js";
import { DOCUMENT_COLUMNS, documentIdParam, storageUnavailable, toDocument } from "../documents.js";
import { perInvestorLimit } from "../rate-limit.js";
import { GET_EXPIRES_SEC } from "../s3.js";
import { requiredChoice, sendInvalid } from "../validation.js";

/** POST /documents/:id/link requests per investor per minute (KP16). */
export const LINK_LIMIT_PER_MINUTE = 30;

/** What each link mode records and how the file is served. */
export const LINK_MODES = Object.freeze({
  inline: Object.freeze({ event: "document_open", disposition: "inline" }),
  download: Object.freeze({ event: "document_download", disposition: "attachment" }),
});

const DOCUMENTS_PATH = "/documents";
const LINK_PATH = `${DOCUMENTS_PATH}/:id/link`;

/** What an investor may see: published, with a file. */
const VISIBLE = "published AND s3_key IS NOT NULL";

const LIST_SQL = `SELECT ${DOCUMENT_COLUMNS} FROM investors.documents WHERE ${VISIBLE} ORDER BY sort_order, created_at, id`;

// FOR SHARE: an admin's unpublish, replace or delete (FOR UPDATE) waits for
// this link's transaction, or this one waits and re-checks the row after it.
const SHARE_SQL = `SELECT ${DOCUMENT_COLUMNS} FROM investors.documents WHERE id = $1 AND ${VISIBLE} FOR SHARE`;

// Serializes one investor's opens, so two at once cannot both be the first.
const LOCK_INVESTOR_SQL = "SELECT id FROM investors.investors WHERE id = $1 FOR NO KEY UPDATE";

const OPENED_BEFORE_SQL = `
  SELECT EXISTS (
    SELECT 1 FROM investors.events WHERE investor_id = $1 AND document_id = $2 AND type = 'document_open'
  ) AS opened`;

const EVENT_SQL = `
  INSERT INTO investors.events (investor_id, type, document_id, document_version)
  VALUES ($1, $2, $3, $4)`;

const linkSchema = z.object({
  mode: requiredChoice(/** @type {[string, ...string[]]} */ (Object.keys(LINK_MODES))),
});

/**
 * The library card's fields, picked from toDocument (never the key, the
 * flags or the sort order).
 * @param {Record<string, any>} row a row of DOCUMENT_COLUMNS
 */
export function toInvestorDocument(row) {
  const { id, title, description, category, kind, fileName, contentType, sizeBytes, pageCount, version, updatedAt } =
    toDocument(row);
  return Object.freeze({
    id,
    title,
    description,
    category,
    kind,
    fileName,
    contentType,
    sizeBytes,
    pageCount,
    version,
    updatedAt,
  });
}

/**
 * @typedef {{db: import("../db.js").Db, store: import("../s3.js").DocStore,
 *   alerts: import("../alerts.js").Alerts, logger: import("../alerts.js").Logger}} Deps
 */

/** @param {Pick<Deps, "db">} deps @returns {import("express").RequestHandler} */
function listDocuments({ db }) {
  return async function getDocuments(_req, res, next) {
    try {
      const { rows } = await db.query(LIST_SQL);
      return res.json({ documents: rows.map(toInvestorDocument) });
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Whether the investor has never opened this document, asked under a lock
 * on the investor's row.
 * @param {import("../db.js").TxClient} client
 * @param {string} investorId
 * @param {string} documentId
 */
async function isFirstOpen(client, investorId, documentId) {
  await client.query(LOCK_INVESTOR_SQL, [investorId]);
  const { rows } = await client.query(OPENED_BEFORE_SQL, [investorId, documentId]);
  return rows[0].opened === false;
}

/**
 * Records the event and signs the link; null when the investor may not see
 * the document. Only an alert-flagged open asks whether it is the first.
 * @param {import("../db.js").TxClient} client
 * @param {import("../s3.js").DocStore} store
 * @param {{investorId: string, documentId: string, mode: keyof typeof LINK_MODES}} request
 */
async function issueLink(client, store, { investorId, documentId, mode }) {
  const { rows } = await client.query(SHARE_SQL, [documentId]);
  const row = rows[0];
  if (!row) return null;
  const { event, disposition } = LINK_MODES[mode];
  const firstOpen = event === "document_open" && row.alert_on_first_open && (await isFirstOpen(client, investorId, row.id));
  await client.query(EVENT_SQL, [investorId, event, row.id, row.version]);
  const link = await store.presignGet({ key: row.s3_key, fileName: row.file_name, disposition });
  return { row, url: link.url, firstOpen };
}

/** @param {Deps} deps @returns {import("express").RequestHandler} */
function createLink({ db, store, alerts, logger }) {
  return async function postLink(req, res, next) {
    const parsed = linkSchema.safeParse(req.body);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    const { investor } = req;
    const request = { investorId: investor.id, documentId: req.params.id, mode: parsed.data.mode };
    try {
      const issued = await db.tx((client) => issueLink(client, store, request));
      if (!issued) return res.status(404).json({ error: "not_found" });
      if (issued.firstOpen) {
        const document = toInvestorDocument(issued.row);
        callAlert(logger, "firstOpen", () => alerts.firstOpen(investor, document));
      }
      return res.json({ url: issued.url, expiresIn: GET_EXPIRES_SEC });
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * The routes exist whatever the config, so the route-coverage test always
 * walks them; without a store the 503 gate answers before any of them runs.
 * @param {{db: import("../db.js").Db, store: import("../s3.js").DocStore | null,
 *   alerts?: import("../alerts.js").Alerts, logger?: import("../alerts.js").Logger}} deps
 *   store is null without the S3 config
 */
export function createDocumentsRouter({ db, store, alerts = NO_ALERTS, logger = console }) {
  const router = express.Router();
  if (!store) router.use(DOCUMENTS_PATH, storageUnavailable);
  const deps = Object.freeze({ db, store: /** @type {import("../s3.js").DocStore} */ (store), alerts, logger });
  router.param("id", documentIdParam);
  router.get(DOCUMENTS_PATH, listDocuments(deps));
  router.post(LINK_PATH, perInvestorLimit({ limit: LINK_LIMIT_PER_MINUTE }), createLink(deps));
  return router;
}
