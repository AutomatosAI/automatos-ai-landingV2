/**
 * One investor, for the admin (US-013): the profile, a summary per document,
 * the timeline a page at a time, and the GDPR export (the profile, the
 * visits and every event). Summaries are aggregated in SQL. A document's
 * furthest page is read over every version and never past the current
 * page_count (0 when no page was recorded), as in the list's deck progress;
 * opens, downloads and time count every version. Events of a deleted
 * document keep their row with no document (document_id is SET NULL).
 */
import { INVESTOR_COLUMNS } from "../auth.js";

export const INVESTOR_SQL = `SELECT ${INVESTOR_COLUMNS} FROM investors.investors WHERE id = $1`;

export const SUMMARY_SQL = `
  SELECT d.id AS document_id, d.title, d.kind, d.page_count,
         count(*) FILTER (WHERE e.type = 'document_open') AS opens,
         LEAST(COALESCE(max(e.page) FILTER (WHERE e.type = 'page_view'), 0), d.page_count) AS furthest_page,
         COALESCE(sum(e.duration_ms) FILTER (WHERE e.type = 'page_view'), 0) AS time_ms,
         bool_or(e.type = 'document_download') AS downloaded
    FROM investors.events e JOIN investors.documents d ON d.id = e.document_id
   WHERE e.investor_id = $1
   GROUP BY d.id
   ORDER BY d.sort_order, d.created_at, d.id`;

/** No row: no such investor. */
export const EVENT_COUNT_SQL = `
  SELECT (SELECT count(*) FROM investors.events WHERE investor_id = i.id) AS total
    FROM investors.investors i WHERE i.id = $1`;

/** An event as toEvent reads it; e is investors.events, d its LEFT JOINed document (overview.js reuses it). */
export const EVENT_COLUMNS = `e.id, e.type, e.session_id, e.document_id, d.title AS document_title, e.document_version,
  e.page, e.duration_ms, e.data, e.created_at`;

/** Newest first; $2 is the page size (investor-list.js PAGE_SIZE), $3 the offset. */
export const TIMELINE_SQL = `
  SELECT ${EVENT_COLUMNS}
    FROM investors.events e LEFT JOIN investors.documents d ON d.id = e.document_id
   WHERE e.investor_id = $1
   ORDER BY e.created_at DESC, e.id DESC
   LIMIT $2 OFFSET $3`;

/** Oldest first: the export reads as a history. */
export const EXPORT_EVENTS_SQL = `
  SELECT ${EVENT_COLUMNS}
    FROM investors.events e LEFT JOIN investors.documents d ON d.id = e.document_id
   WHERE e.investor_id = $1
   ORDER BY e.created_at, e.id`;

export const EXPORT_SESSIONS_SQL = `
  SELECT id, started_at, last_heartbeat_at, user_agent
    FROM investors.sessions WHERE investor_id = $1
   ORDER BY started_at, id`;

export const BLOCK_SQL = `UPDATE investors.investors SET blocked = $2 WHERE id = $1 RETURNING ${INVESTOR_COLUMNS}`;

/** Sessions, events and alerts_sent go with it (every FK to investors.id cascades). */
export const DELETE_SQL = "DELETE FROM investors.investors WHERE id = $1";

/**
 * A timeline or export event as the API answers it.
 * @param {Record<string, any>} row a row of EVENT_COLUMNS
 */
export function toEvent(row) {
  return Object.freeze({
    id: row.id,
    type: row.type,
    sessionId: row.session_id,
    documentId: row.document_id,
    documentTitle: row.document_title,
    documentVersion: row.document_version,
    page: row.page,
    durationMs: row.duration_ms,
    data: row.data,
    createdAt: row.created_at,
  });
}

/** @param {Record<string, any>} row a row of SUMMARY_SQL */
export function toDocumentSummary(row) {
  return Object.freeze({
    documentId: row.document_id,
    title: row.title,
    kind: row.kind,
    pageCount: row.page_count,
    opens: row.opens,
    furthestPage: row.furthest_page,
    timeMs: row.time_ms,
    downloaded: row.downloaded === true,
  });
}

/** @param {Record<string, any>} row a row of EXPORT_SESSIONS_SQL */
export function toSession(row) {
  return Object.freeze({
    id: row.id,
    startedAt: row.started_at,
    lastHeartbeatAt: row.last_heartbeat_at,
    userAgent: row.user_agent,
  });
}
