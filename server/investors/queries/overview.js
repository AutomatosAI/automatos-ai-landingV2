/**
 * The admin overview (US-011): the headline counts, a daily series and the
 * latest events, each aggregated in Postgres (no table is read into Node).
 *
 * - The 7-day counts are a rolling window: created_at at or after now()
 *   minus WINDOW_DAYS days. An active investor is one with any event in it;
 *   a deck open is a document_open on a document whose alert-on-first-open
 *   flag is set now; downloads count every document_download.
 * - The series is SERIES_DAYS calendar days in UTC, today last, one row per
 *   day whatever happened (generate_series, zero-filled): sign-ups are the
 *   investor rows created that day, active investors the distinct investors
 *   with any event that day.
 * - The latest events are the newest LATEST_EVENTS of anyone's, each with
 *   its investor and, when it has one, its document's current title.
 */
import { EVENT_COLUMNS, toEvent } from "./investor-detail.js";

export const WINDOW_DAYS = 7;
export const SERIES_DAYS = 30;
export const LATEST_EVENTS = 20;

// $1 the window in days.
export const COUNTS_SQL = `
  WITH since AS (SELECT now() - make_interval(days => $1::int) AS at)
  SELECT (SELECT count(*) FROM investors.investors) AS investors_total,
         (SELECT count(*) FROM investors.investors, since WHERE created_at >= since.at) AS investors_new,
         (SELECT count(DISTINCT investor_id) FROM investors.events, since WHERE created_at >= since.at)
           AS active_investors,
         (SELECT count(*)
            FROM investors.events e JOIN investors.documents d ON d.id = e.document_id, since
           WHERE e.type = 'document_open' AND d.alert_on_first_open AND e.created_at >= since.at) AS deck_opens,
         (SELECT count(*) FROM investors.events, since
           WHERE type = 'document_download' AND created_at >= since.at) AS downloads`;

// $1 the number of days, today (UTC) included. A date is sent as text: pg would make it a local-midnight Date.
export const SERIES_SQL = `
  WITH bounds AS (
    SELECT (now() AT TIME ZONE 'UTC')::date - ($1::int - 1) AS first_day, (now() AT TIME ZONE 'UTC')::date AS today
  ),
  days AS (
    SELECT day::date AS day FROM bounds, generate_series(bounds.first_day, bounds.today, interval '1 day') AS day
  ),
  signups AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day, count(*) AS n
      FROM investors.investors, bounds
     WHERE created_at >= bounds.first_day AT TIME ZONE 'UTC'
     GROUP BY 1
  ),
  active AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day, count(DISTINCT investor_id) AS n
      FROM investors.events, bounds
     WHERE created_at >= bounds.first_day AT TIME ZONE 'UTC'
     GROUP BY 1
  )
  SELECT to_char(days.day, 'YYYY-MM-DD') AS date, COALESCE(signups.n, 0) AS signups,
         COALESCE(active.n, 0) AS active_investors
    FROM days
    LEFT JOIN signups ON signups.day = days.day
    LEFT JOIN active ON active.day = days.day
   ORDER BY days.day`;

// $1 how many. A deleted document's events keep their row with no title (document_id is SET NULL).
export const LATEST_EVENTS_SQL = `
  SELECT ${EVENT_COLUMNS}, e.investor_id, i.name AS investor_name, i.firm AS investor_firm, i.email AS investor_email
    FROM investors.events e
    JOIN investors.investors i ON i.id = e.investor_id
    LEFT JOIN investors.documents d ON d.id = e.document_id
   ORDER BY e.created_at DESC, e.id DESC
   LIMIT $1`;

/** @param {Record<string, any>} row the row of COUNTS_SQL */
export function toCounts(row) {
  return Object.freeze({
    investorsTotal: row.investors_total,
    investorsNew7d: row.investors_new,
    activeInvestors7d: row.active_investors,
    deckOpens7d: row.deck_opens,
    downloads7d: row.downloads,
  });
}

/** @param {Record<string, any>} row a row of SERIES_SQL */
export function toSeriesDay(row) {
  return Object.freeze({ date: row.date, signups: row.signups, activeInvestors: row.active_investors });
}

/**
 * A timeline event (investor-detail.js toEvent) with the investor it belongs to.
 * @param {Record<string, any>} row a row of LATEST_EVENTS_SQL
 */
export function toLatestEvent(row) {
  return Object.freeze({
    ...toEvent(row),
    investorId: row.investor_id,
    investorName: row.investor_name,
    investorFirm: row.investor_firm,
    investorEmail: row.investor_email,
  });
}
