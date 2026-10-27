/**
 * The admin investors list (US-012): one page of investors with their
 * engagement, filtered, searched and sorted in SQL (no table is read into
 * Node). Each row's aggregates come from LATERAL subqueries over the
 * investor's own sessions and events (the investor_id indexes):
 *
 * - sessions: visits opened (POST /sessions);
 * - totalMs: the duration_ms of every page_view and section_view;
 * - docsOpened: distinct documents with a document_open;
 * - downloads: document_download rows (every link is one, no dedupe);
 * - deckProgress: on the alert-on-first-open document this investor opened
 *   most (ties: the latest open, then the id), the furthest page read over
 *   every version, never past the current page_count (0 when no page was
 *   recorded); null when the investor opened no such document.
 *
 * The ORDER BY is never built from the request: every sort key and
 * direction pair is a statement written here, at load, from constants, and
 * the route picks one by its zod-checked key.
 */

export const PAGE_SIZE = 50;

/** Sort key → the expression it orders by; text sorts ignore letter case. */
const ORDER_BY = Object.freeze({
  name: "lower(i.name)",
  firm: "lower(i.firm)",
  created_at: "i.created_at",
  last_seen_at: "i.last_seen_at",
  sessions: "s.sessions",
  total_ms: "e.total_ms",
  docs_opened: "e.docs_opened",
  downloads: "e.downloads",
});

const DIRECTIONS = Object.freeze({ asc: "ASC", desc: "DESC" });

export const SORT_KEYS = Object.freeze(Object.keys(ORDER_BY));
export const SORT_DIRECTIONS = Object.freeze(Object.keys(DIRECTIONS));
export const DEFAULT_SORT = "last_seen_at";
export const DEFAULT_DIRECTION = "desc";

// $1 the search pattern (searchPattern) or null, $2 the type or null, $3 the source or null.
const FILTER = `
  ($1::text IS NULL OR i.name ILIKE $1 ESCAPE '\\' OR i.email ILIKE $1 ESCAPE '\\' OR i.firm ILIKE $1 ESCAPE '\\')
  AND ($2::text IS NULL OR i.investor_type = $2)
  AND ($3::text IS NULL OR i.source = $3)`;

export const COUNT_SQL = `SELECT count(*) AS total FROM investors.investors i WHERE ${FILTER}`;

const PAGE_SQL = `
  SELECT i.id, i.name, i.email, i.firm, i.investor_type, i.cheque_size, i.source, i.created_at, i.last_seen_at,
         i.blocked, s.sessions, e.total_ms, e.docs_opened, e.downloads,
         deck.document_id AS deck_document_id, deck.max_page AS deck_max_page, deck.page_count AS deck_page_count
    FROM investors.investors i
   CROSS JOIN LATERAL (
     SELECT count(*) AS sessions FROM investors.sessions WHERE investor_id = i.id
   ) s
   CROSS JOIN LATERAL (
     SELECT COALESCE(sum(duration_ms) FILTER (WHERE type IN ('page_view', 'section_view')), 0) AS total_ms,
            count(DISTINCT document_id) FILTER (WHERE type = 'document_open') AS docs_opened,
            count(*) FILTER (WHERE type = 'document_download') AS downloads
       FROM investors.events WHERE investor_id = i.id
   ) e
    LEFT JOIN LATERAL (
     SELECT d.id AS document_id, d.page_count,
            LEAST(COALESCE((
              SELECT max(p.page) FROM investors.events p
               WHERE p.investor_id = i.id AND p.document_id = d.id AND p.type = 'page_view'
            ), 0), d.page_count) AS max_page
       FROM investors.events o JOIN investors.documents d ON d.id = o.document_id
      WHERE o.investor_id = i.id AND o.type = 'document_open' AND d.alert_on_first_open
      GROUP BY d.id
      ORDER BY count(*) DESC, max(o.created_at) DESC, d.id
      LIMIT 1
   ) deck ON true
   WHERE ${FILTER}
   ORDER BY %ORDER% NULLS LAST, i.id
   LIMIT $4 OFFSET $5`;

/** Every sort key and direction's statement, keyed 'key dir'. */
const PAGE_STATEMENTS = Object.freeze(
  Object.fromEntries(
    SORT_KEYS.flatMap((key) =>
      SORT_DIRECTIONS.map((dir) => [`${key} ${dir}`, PAGE_SQL.replace("%ORDER%", `${ORDER_BY[key]} ${DIRECTIONS[dir]}`)]),
    ),
  ),
);

/**
 * The page statement for a sort key and direction.
 * @param {string} sort one of SORT_KEYS
 * @param {string} dir one of SORT_DIRECTIONS
 */
export function pageSql(sort, dir) {
  const sql = PAGE_STATEMENTS[`${sort} ${dir}`];
  if (!sql) throw new TypeError(`pageSql: unknown sort '${sort} ${dir}'`);
  return sql;
}

/**
 * An ILIKE pattern matching the text anywhere, with the text's own
 * wildcards (% and _) and the escape character taken literally; null for
 * no search.
 * @param {string | null} text
 */
export function searchPattern(text) {
  if (text === null) return null;
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/**
 * The parameters of COUNT_SQL ($1..$3) and of a page statement ($1..$5).
 * @param {{q: string | null, type: string | null, source: string | null, page: number}} filter
 */
export function listParams({ q, type, source, page }) {
  const where = [searchPattern(q), type, source];
  return Object.freeze({ count: where, page: [...where, PAGE_SIZE, (page - 1) * PAGE_SIZE] });
}

/** @param {Record<string, any>} row */
function deckProgressOf(row) {
  if (!row.deck_document_id) return null;
  return Object.freeze({ documentId: row.deck_document_id, maxPage: row.deck_max_page, pageCount: row.deck_page_count });
}

/**
 * A page row as the API answers it.
 * @param {Record<string, any>} row
 */
export function toListRow(row) {
  return Object.freeze({
    id: row.id,
    name: row.name,
    email: row.email,
    firm: row.firm,
    investorType: row.investor_type,
    chequeSize: row.cheque_size,
    source: row.source,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    sessions: row.sessions,
    totalMs: row.total_ms,
    docsOpened: row.docs_opened,
    downloads: row.downloads,
    deckProgress: deckProgressOf(row),
    blocked: row.blocked,
  });
}
