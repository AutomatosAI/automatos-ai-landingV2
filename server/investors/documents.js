/**
 * The documents table as the API answers it (US-014, US-006). Routes select
 * DOCUMENT_COLUMNS and answer through toDocument(), which names every field
 * it lets out: the s3_key and created_by columns never leave the server.
 */

/** The kind CHECK list of 001_init.sql. */
export const DOCUMENT_KINDS = Object.freeze(["pdf", "video", "spreadsheet", "slides", "doc", "other"]);

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
