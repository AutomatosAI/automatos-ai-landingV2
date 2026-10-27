/**
 * One document's analytics for the admin (US-015): who read one version of
 * it, how far and for how long, and where readers drop off. Everything is
 * aggregated in Postgres over that version's events (the (document_id,
 * type) index); no event is read into Node.
 *
 * - A reader is an investor with any event of the document at that
 *   version: an open, a download, a page view or video progress. A reader
 *   who never had a page recorded (a download, an open closed before the
 *   first page counted) has furthest page 0 and time 0, and still counts.
 * - opens and downloads count rows: every link is one (W1-11, no dedupe).
 * - avgTimeMs is the average over readers of each one's page_view time.
 * - pages is 1..page_count, one row per page whatever happened
 *   (generate_series, zero-filled): avgDwellMs is the average, over the
 *   readers who viewed that page, of each one's total time on it;
 *   readersReached counts the readers whose furthest page is at or past it,
 *   so it never grows down the document, and pctReached is that share of
 *   every reader, rounded to one decimal. A document with no page_count
 *   (not a PDF) has no pages.
 * - page_count is kept for the current file only, so an older version is
 *   charted over the current page count; its readers' furthest page is as
 *   recorded (events.js bounds the current version's pages by page_count).
 * - readers are ordered by their latest open, newest first; readers who
 *   never opened (download only) come last, latest activity first.
 * - versions lists every version with events, newest first.
 */

/** The version column is an integer: no version is larger. */
export const MAX_VERSION = 2_147_483_647;

// $1 the document id, $2 the version: one row per reader.
const READERS = `
  readers AS (
    SELECT investor_id,
           COALESCE(max(page) FILTER (WHERE type = 'page_view'), 0) AS furthest_page,
           COALESCE(sum(duration_ms) FILTER (WHERE type = 'page_view'), 0) AS time_ms,
           count(*) FILTER (WHERE type = 'document_open') AS opens,
           count(*) FILTER (WHERE type = 'document_download') AS downloads,
           max(created_at) FILTER (WHERE type = 'document_open') AS last_open_at,
           max(created_at) AS last_event_at
      FROM investors.events
     WHERE document_id = $1 AND document_version = $2
     GROUP BY investor_id
  )`;

// sum and avg of int8 are numeric (a string from pg): cast back to bigint.
export const SUMMARY_SQL = `
  WITH ${READERS}
  SELECT count(*) AS unique_readers,
         COALESCE(sum(opens), 0)::bigint AS opens,
         COALESCE(sum(downloads), 0)::bigint AS downloads,
         COALESCE(round(avg(time_ms)), 0)::bigint AS avg_time_ms
    FROM readers`;

// generate_series(1, NULL) yields no rows: a document without page_count has no pages.
export const PAGES_SQL = `
  WITH ${READERS},
  dwell AS (
    SELECT page, investor_id, sum(duration_ms) AS ms
      FROM investors.events
     WHERE document_id = $1 AND document_version = $2 AND type = 'page_view'
     GROUP BY page, investor_id
  ),
  pages AS (
    SELECT page FROM investors.documents d, generate_series(1, d.page_count) AS page WHERE d.id = $1
  ),
  total AS (SELECT count(*) AS readers FROM readers)
  SELECT p.page, dw.avg_dwell_ms, reached.readers AS readers_reached,
         COALESCE(round(100.0 * reached.readers / NULLIF(total.readers, 0), 1), 0)::float8 AS pct_reached
    FROM pages p
   CROSS JOIN total
   CROSS JOIN LATERAL (
     SELECT COALESCE(round(avg(ms)), 0)::bigint AS avg_dwell_ms FROM dwell WHERE dwell.page = p.page
   ) dw
   CROSS JOIN LATERAL (
     SELECT count(*) AS readers FROM readers WHERE readers.furthest_page >= p.page
   ) reached
   ORDER BY p.page`;

export const READERS_SQL = `
  WITH ${READERS}
  SELECT r.investor_id, i.name, i.firm, r.furthest_page, r.time_ms, r.downloads > 0 AS downloaded, r.last_open_at
    FROM readers r JOIN investors.investors i ON i.id = r.investor_id
   ORDER BY r.last_open_at DESC NULLS LAST, r.last_event_at DESC, r.investor_id`;

// $1 the document id.
export const VERSIONS_SQL = `
  SELECT DISTINCT document_version AS version
    FROM investors.events
   WHERE document_id = $1 AND document_version IS NOT NULL
   ORDER BY version DESC`;

/** @param {Record<string, any>} row the row of SUMMARY_SQL */
export function toSummary(row) {
  return Object.freeze({
    uniqueReaders: row.unique_readers,
    opens: row.opens,
    downloads: row.downloads,
    avgTimeMs: row.avg_time_ms,
  });
}

/** @param {Record<string, any>} row a row of PAGES_SQL */
export function toPageStats(row) {
  return Object.freeze({
    page: row.page,
    avgDwellMs: row.avg_dwell_ms,
    readersReached: row.readers_reached,
    pctReached: row.pct_reached,
  });
}

/** @param {Record<string, any>} row a row of READERS_SQL */
export function toReader(row) {
  return Object.freeze({
    investorId: row.investor_id,
    name: row.name,
    firm: row.firm,
    furthestPage: row.furthest_page,
    timeMs: row.time_ms,
    downloaded: row.downloaded === true,
    lastOpenAt: row.last_open_at,
  });
}

/**
 * {versions, uniqueReaders, opens, downloads, avgTimeMs, pages, readers}
 * for one version of a document known to exist.
 * @param {import("../db.js").Db} db
 * @param {string} documentId
 * @param {number} version
 */
export async function documentStats(db, documentId, version) {
  const params = [documentId, version];
  const [summary, pages, readers, versions] = await Promise.all([
    db.query(SUMMARY_SQL, params),
    db.query(PAGES_SQL, params),
    db.query(READERS_SQL, params),
    db.query(VERSIONS_SQL, [documentId]),
  ]);
  return {
    versions: versions.rows.map((row) => row.version),
    ...toSummary(summary.rows[0]),
    pages: pages.rows.map(toPageStats),
    readers: readers.rows.map(toReader),
  };
}
