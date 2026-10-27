/**
 * The documents table as the API answers it (US-014, US-006). Routes select
 * DOCUMENT_COLUMNS and answer through toDocument(), which names every field
 * it lets out: the s3_key and created_by columns never leave the server.
 * The admin and investor document routers share the :id check and the 503
 * they answer without the S3 config (KP4).
 */

/** The kind CHECK list of 001_init.sql. */
export const DOCUMENT_KINDS = Object.freeze(["pdf", "video", "spreadsheet", "slides", "doc", "other"]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What an investor may see (a WHERE clause on investors.documents): published, with a file. */
export const VISIBLE_TO_INVESTORS = "published AND s3_key IS NOT NULL";

/** Every column the routes read; toDocument decides what leaves the server. */
export const DOCUMENT_COLUMNS = `id, title, description, category, kind, s3_key, file_name, content_type, size_bytes,
  page_count, version, sort_order, published, alert_on_first_open, created_at, updated_at`;

/**
 * @param {Record<string, any>} row a row of DOCUMENT_COLUMNS
 */
export function toDocument(row) {
  return Object.freeze({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    kind: row.kind,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    pageCount: row.page_count,
    version: row.version,
    sortOrder: row.sort_order,
    published: row.published,
    alertOnFirstOpen: row.alert_on_first_open,
    hasFile: row.s3_key != null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

/**
 * router.param("id") handler: an id that is not a uuid is no such document
 * (and Postgres is never asked to cast it).
 * @type {import("express").RequestParamHandler}
 */
export function documentIdParam(_req, res, next, id) {
  if (UUID.test(id)) return next();
  return res.status(404).json({ error: "not_found" });
}

/**
 * Mounted in front of the document routes when there is no S3 config.
 * @type {import("express").RequestHandler}
 */
export function storageUnavailable(_req, res) {
  res.status(503).json({ error: "storage_unavailable" });
}
