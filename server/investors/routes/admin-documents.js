/**
 * Admin documents (US-014): list, create, edit, upload, finalize, preview and
 * delete the documents investors read. Mounted behind requireInvestor and the
 * /admin gate (KP3). Files live in the private bucket (s3.js, KP11): the
 * admin's browser PUTs a file to a presigned URL, then finalize HEADs the
 * object, checks it against KP11 again and records it on the row; a replace
 * bumps the version and removes the replaced file. The row's s3_key never
 * leaves the server: only upload-url echoes the key it has just signed.
 *
 * Without the S3 config every route here answers 503
 * {error:'storage_unavailable'}; the rest of the portal keeps working (KP4).
 * Previews are an admin's, so they write no investor event (KP16). Stats
 * (US-015) read one version's events; the SQL is in queries/document-stats.js.
 */
import express from "express";
import { z } from "zod";
import { DOCUMENT_COLUMNS, DOCUMENT_KINDS, documentIdParam, storageUnavailable, toDocument } from "../documents.js";
import { MAX_VERSION, documentStats } from "../queries/document-stats.js";
import { GET_EXPIRES_SEC, PUT_EXPIRES_SEC, UploadRejectedError, checkUpload, documentKey } from "../s3.js";
import { FIELD_CODES, optionalText, requiredBoolean, requiredChoice, requiredText, sendInvalid } from "../validation.js";

export const DOCUMENT_LIMITS = Object.freeze({
  title: 160,
  description: 600,
  category: 60,
  fileName: 255,
  contentType: 255,
  key: 300,
  sortOrder: 1_000_000,
  /** KP16: a page is 1..2000 when the count is unknown, so no count is larger. */
  pageCount: 2000,
});

const DOCUMENTS_PATH = "/admin/documents";
const DOCUMENT_PATH = `${DOCUMENTS_PATH}/:id`;
const PDF = "application/pdf";
const KEY_SHAPE = /^documents\/[^/]+\/v(\d{1,10})\/([^/]+)$/;

/** The answer for each refusal a route returns by code. */
const ERROR_STATUS = Object.freeze({
  not_found: 404,
  no_file: 409,
  not_uploaded: 409,
  stale_upload: 409,
  content_type_not_allowed: 400,
  invalid_size: 400,
  file_too_large: 400,
});

const LIST_SQL = `SELECT ${DOCUMENT_COLUMNS} FROM investors.documents ORDER BY sort_order, created_at, id`;
const SELECT_SQL = `SELECT ${DOCUMENT_COLUMNS} FROM investors.documents WHERE id = $1`;
const LOCK_SQL = `${SELECT_SQL} FOR UPDATE`;
const DELETE_SQL = "DELETE FROM investors.documents WHERE id = $1";

// A new document goes to the end of the list.
const CREATE_SQL = `
  INSERT INTO investors.documents (title, description, category, kind, alert_on_first_open, created_by, sort_order)
  VALUES ($1, $2, $3, $4, $5, $6, (SELECT COALESCE(max(sort_order) + 1, 0) FROM investors.documents))
  RETURNING ${DOCUMENT_COLUMNS}`;

const EDIT_SQL = `
  UPDATE investors.documents
     SET title = $2, description = $3, category = $4, kind = $5, sort_order = $6, published = $7,
         alert_on_first_open = $8, updated_at = now()
   WHERE id = $1
  RETURNING ${DOCUMENT_COLUMNS}`;

const FINALIZE_SQL = `
  UPDATE investors.documents
     SET s3_key = $2, file_name = $3, content_type = $4, size_bytes = $5, page_count = $6, version = $7,
         updated_at = now()
   WHERE id = $1
  RETURNING ${DOCUMENT_COLUMNS}`;

/** A number that must be sent. */
const requiredNumber = () =>
  z.number({
    errorMap: (_issue, ctx) => ({ message: ctx.data === undefined ? FIELD_CODES.required : FIELD_CODES.invalid }),
  });

/** @param {number} min @param {number} max */
const integerBetween = (min, max) =>
  requiredNumber().int(FIELD_CODES.invalid).min(min, FIELD_CODES.invalid).max(max, FIELD_CODES.invalid);

/** A PDF's page count, measured in the admin's browser; missing or null is null. */
const pageCount = z.preprocess((value) => value ?? null, integerBetween(1, DOCUMENT_LIMITS.pageCount).nullable());

const kind = requiredChoice(/** @type {[string, ...string[]]} */ (DOCUMENT_KINDS));

/** New document metadata (unknown keys, such as published or a key, are dropped). */
export const createSchema = z.object({
  title: requiredText(DOCUMENT_LIMITS.title),
  description: optionalText(DOCUMENT_LIMITS.description),
  category: requiredText(DOCUMENT_LIMITS.category),
  kind,
  alertOnFirstOpen: requiredBoolean().default(false),
});

/** Any of the editable fields; at least one. Blank or null description clears it. */
export const editSchema = z
  .object({
    title: requiredText(DOCUMENT_LIMITS.title).optional(),
    description: optionalText(DOCUMENT_LIMITS.description).optional(),
    category: requiredText(DOCUMENT_LIMITS.category).optional(),
    kind: kind.optional(),
    sortOrder: integerBetween(0, DOCUMENT_LIMITS.sortOrder).optional(),
    published: requiredBoolean().optional(),
    alertOnFirstOpen: requiredBoolean().optional(),
  })
  .refine((edit) => Object.keys(edit).length > 0, FIELD_CODES.required);

/** KP11's type and size limits are checked by the doc store, which answers with a code. */
const uploadSchema = z.object({
  fileName: requiredText(DOCUMENT_LIMITS.fileName),
  contentType: requiredText(DOCUMENT_LIMITS.contentType),
  contentLength: requiredNumber(),
  pageCount,
});

const finalizeSchema = z.object({ key: requiredText(DOCUMENT_LIMITS.key), pageCount });

/** ?version=N: a whole number from 1; missing is the document's current version. */
export const statsQuerySchema = z.object({
  version: z
    .string({ errorMap: () => ({ message: FIELD_CODES.invalid }) })
    .regex(/^[1-9]\d{0,9}$/, FIELD_CODES.invalid)
    .transform(Number)
    .refine((version) => version <= MAX_VERSION, FIELD_CODES.invalid)
    .optional(),
});

/**
 * The version the next upload is stored as: the current one until a file is
 * recorded, the one after it for a replace.
 * @param {Record<string, any>} row
 */
const nextVersion = (row) => (row.s3_key ? row.version + 1 : row.version);

/**
 * The version and file name of a key built by documentKey() for this
 * document, or null for any other string: rebuilt from its parts, the key
 * must come out the same.
 * @param {string} documentId the row's id
 * @param {string} key
 */
function readKey(documentId, key) {
  const match = KEY_SHAPE.exec(key);
  if (!match) return null;
  const [, digits, fileName] = match;
  const version = Number(digits);
  try {
    return documentKey(documentId, version, fileName) === key ? { version, fileName } : null;
  } catch {
    return null;
  }
}

/**
 * @param {import("express").Response} res
 * @param {keyof typeof ERROR_STATUS} code
 */
const sendError = (res, code) => res.status(ERROR_STATUS[code]).json({ error: code });

/** @param {import("../db.js").Db} db @param {string} id */
async function findDocument(db, id) {
  const { rows } = await db.query(SELECT_SQL, [id]);
  return rows[0] ?? null;
}

/**
 * Best effort: a file that cannot be removed is logged and left for a manual
 * clean-up; the request still succeeds. The log names the key's folder
 * (documents/<id>/v<n>), never the file name or a URL.
 * @param {import("../s3.js").DocStore} store
 * @param {string} key
 * @param {import("../alerts.js").Logger} logger
 */
async function removeQuietly(store, key, logger) {
  try {
    await store.remove(key);
  } catch (err) {
    const folder = key.slice(0, key.lastIndexOf("/"));
    logger.error(`[investors] could not remove a file in ${folder}: ${err instanceof Error ? err.name : typeof err}`);
  }
}

/**
 * Removes a file no row will point at (a replaced file, a stale upload, an
 * upload whose document was deleted), unless it is the document's current
 * file.
 * @param {Pick<Deps, "store" | "logger">} deps
 * @param {string} key
 * @param {string | null} currentKey
 */
async function removeUnlessCurrent({ store, logger }, key, currentKey) {
  if (key !== currentKey) await removeQuietly(store, key, logger);
}

/**
 * @typedef {{db: import("../db.js").Db, store: import("../s3.js").DocStore,
 *   logger: import("../alerts.js").Logger}} Deps
 */

/** @param {Pick<Deps, "db">} deps @returns {import("express").RequestHandler} */
function listDocuments({ db }) {
  return async function getDocuments(_req, res, next) {
    try {
      const { rows } = await db.query(LIST_SQL);
      return res.json({ documents: rows.map(toDocument) });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Pick<Deps, "db">} deps @returns {import("express").RequestHandler} */
function createDocument({ db }) {
  return async function postDocument(req, res, next) {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    const { title, description, category, kind: docKind, alertOnFirstOpen } = parsed.data;
    try {
      const params = [title, description, category, docKind, alertOnFirstOpen, req.investor.clerkUserId];
      const { rows } = await db.query(CREATE_SQL, params);
      return res.status(201).json({ document: toDocument(rows[0]) });
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Under the row lock, so the publish check cannot race a finalize or a
 * delete: a published document always has a file.
 * @param {import("../db.js").TxClient} client
 * @param {string} id
 * @param {z.infer<typeof editSchema>} edit
 */
async function applyEdit(client, id, edit) {
  const { rows } = await client.query(LOCK_SQL, [id]);
  const row = rows[0];
  if (!row) return { error: /** @type {const} */ ("not_found") };
  const next = { ...toDocument(row), ...edit };
  if (next.published && !row.s3_key) return { error: /** @type {const} */ ("no_file") };
  const params = [id, next.title, next.description, next.category, next.kind, next.sortOrder, next.published];
  const saved = await client.query(EDIT_SQL, [...params, next.alertOnFirstOpen]);
  return { row: saved.rows[0] };
}

/** @param {Pick<Deps, "db">} deps @returns {import("express").RequestHandler} */
function editDocument({ db }) {
  return async function patchDocument(req, res, next) {
    const parsed = editSchema.safeParse(req.body);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    try {
      const result = await db.tx((client) => applyEdit(client, req.params.id, parsed.data));
      if ("error" in result) return sendError(res, result.error);
      return res.json({ document: toDocument(result.row) });
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Under the row lock: the row is deleted, the file removed, and only then
 * does the deletion commit. If S3 refuses, the transaction rolls back, the
 * row stays and the admin can retry; once the file is gone only COMMIT can
 * still fail. Events keep their rows with document_id NULL (the FK).
 * @param {import("../db.js").TxClient} client
 * @param {import("../s3.js").DocStore} store
 * @param {string} id
 */
async function removeDocument(client, store, id) {
  const { rows } = await client.query(LOCK_SQL, [id]);
  if (rows.length === 0) return false;
  await client.query(DELETE_SQL, [id]);
  if (rows[0].s3_key) await store.remove(rows[0].s3_key);
  return true;
}

/** @param {Pick<Deps, "db" | "store">} deps @returns {import("express").RequestHandler} */
function deleteDocument({ db, store }) {
  return async function deleteOne(req, res, next) {
    try {
      const removed = await db.tx((client) => removeDocument(client, store, req.params.id));
      return removed ? res.status(204).end() : sendError(res, "not_found");
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Pick<Deps, "db" | "store">} deps @returns {import("express").RequestHandler} */
function createUploadUrl({ db, store }) {
  return async function postUploadUrl(req, res, next) {
    const parsed = uploadSchema.safeParse(req.body);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    const { fileName, contentType, contentLength } = parsed.data;
    try {
      const row = await findDocument(db, req.params.id);
      if (!row) return sendError(res, "not_found");
      const key = documentKey(row.id, nextVersion(row), fileName);
      const upload = await store.presignPut({ key, contentType, contentLength });
      return res.json({ url: upload.url, key, headers: upload.headers, expiresIn: PUT_EXPIRES_SEC });
    } catch (err) {
      if (err instanceof UploadRejectedError) return sendError(res, err.code);
      return next(err);
    }
  };
}

/**
 * The uploaded object, checked against KP11 again. A rejected object is
 * removed so it never lingers in the bucket.
 * @param {Pick<Deps, "store" | "logger">} deps
 * @param {string} key
 */
async function checkedObject({ store, logger }, key) {
  const info = await store.head(key);
  if (!info) return { error: /** @type {const} */ ("not_uploaded") };
  try {
    return { info: checkUpload({ contentType: info.contentType, contentLength: info.size }) };
  } catch (err) {
    if (!(err instanceof UploadRejectedError)) throw err;
    await removeQuietly(store, key, logger);
    return { error: err.code };
  }
}

/**
 * Under the row lock: a second finalize of the same upload, or one racing
 * another upload, finds the version moved on and records nothing.
 * @param {import("../db.js").TxClient} client
 * @param {string} id
 * @param {{key: string, version: number, fileName: string, contentType: string, sizeBytes: number,
 *   pageCount: number | null}} upload
 */
async function recordUpload(client, id, upload) {
  const { rows } = await client.query(LOCK_SQL, [id]);
  const row = rows[0];
  if (!row) return { error: /** @type {const} */ ("not_found"), currentKey: null };
  /** @type {string | null} */
  const currentKey = row.s3_key;
  if (nextVersion(row) !== upload.version) return { error: /** @type {const} */ ("stale_upload"), currentKey };
  const { key, fileName, contentType, sizeBytes, pageCount: pages, version } = upload;
  const saved = await client.query(FINALIZE_SQL, [id, key, fileName, contentType, sizeBytes, pages, version]);
  return { row: saved.rows[0], previousKey: currentKey };
}

/** @param {Deps} deps @returns {import("express").RequestHandler} */
function finalizeUpload(deps) {
  return async function postFinalize(req, res, next) {
    const parsed = finalizeSchema.safeParse(req.body);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    const { key } = parsed.data;
    try {
      const row = await findDocument(deps.db, req.params.id);
      if (!row) return sendError(res, "not_found");
      const target = readKey(row.id, key);
      if (!target) return res.status(400).json({ error: "invalid", fields: { key: FIELD_CODES.invalid } });
      if (target.version !== nextVersion(row)) {
        await removeUnlessCurrent(deps, key, row.s3_key);
        return sendError(res, "stale_upload");
      }
      const checked = await checkedObject(deps, key);
      if ("error" in checked) return sendError(res, checked.error);
      const { contentType, contentLength } = checked.info;
      const pages = contentType === PDF ? parsed.data.pageCount : null;
      const upload = { key, ...target, contentType, sizeBytes: contentLength, pageCount: pages };
      const result = await deps.db.tx((client) => recordUpload(client, row.id, upload));
      if ("error" in result) {
        await removeUnlessCurrent(deps, key, result.currentKey);
        return sendError(res, result.error);
      }
      if (result.previousKey) await removeUnlessCurrent(deps, result.previousKey, key);
      return res.json({ document: toDocument(result.row) });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Pick<Deps, "db" | "store">} deps @returns {import("express").RequestHandler} */
function createPreviewLink({ db, store }) {
  return async function postPreviewLink(req, res, next) {
    try {
      const row = await findDocument(db, req.params.id);
      if (!row) return sendError(res, "not_found");
      if (!row.s3_key) return sendError(res, "no_file");
      const link = await store.presignGet({ key: row.s3_key, fileName: row.file_name, disposition: "inline" });
      return res.json({ url: link.url, expiresIn: GET_EXPIRES_SEC });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {Pick<Deps, "db">} deps @returns {import("express").RequestHandler} */
function showStats({ db }) {
  return async function getStats(req, res, next) {
    const parsed = statsQuerySchema.safeParse(req.query);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    try {
      const row = await findDocument(db, req.params.id);
      if (!row) return sendError(res, "not_found");
      const version = parsed.data.version ?? row.version;
      const stats = await documentStats(db, row.id, version);
      return res.json({ document: toDocument(row), version, ...stats });
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * The routes exist whatever the config, so the route-coverage test always
 * walks them; without a store the 503 gate answers before any of them runs.
 * @param {{db: import("../db.js").Db, store: import("../s3.js").DocStore | null,
 *   logger?: import("../alerts.js").Logger}} deps store is null without the S3 config
 */
export function createAdminDocumentsRouter({ db, store, logger = console }) {
  const router = express.Router();
  if (!store) router.use(DOCUMENTS_PATH, storageUnavailable);
  const deps = Object.freeze({ db, store: /** @type {import("../s3.js").DocStore} */ (store), logger });
  router.param("id", documentIdParam);
  router.get(DOCUMENTS_PATH, listDocuments(deps));
  router.post(DOCUMENTS_PATH, createDocument(deps));
  router.patch(DOCUMENT_PATH, editDocument(deps));
  router.delete(DOCUMENT_PATH, deleteDocument(deps));
  router.post(`${DOCUMENT_PATH}/upload-url`, createUploadUrl(deps));
  router.post(`${DOCUMENT_PATH}/finalize`, finalizeUpload(deps));
  router.post(`${DOCUMENT_PATH}/preview-link`, createPreviewLink(deps));
  router.get(`${DOCUMENT_PATH}/stats`, showStats(deps));
  return router;
}
