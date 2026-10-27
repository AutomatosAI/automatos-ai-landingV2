/**
 * The admin overview (US-011): GET /admin/overview, one screen of investor
 * interest. Mounted behind requireInvestor and the /admin gate (KP3). It
 * reads nothing from the request; the SQL and the answer shape are in
 * queries/overview.js.
 */
import express from "express";
import {
  COUNTS_SQL,
  LATEST_EVENTS,
  LATEST_EVENTS_SQL,
  SERIES_DAYS,
  SERIES_SQL,
  WINDOW_DAYS,
  toCounts,
  toLatestEvent,
  toSeriesDay,
} from "../queries/overview.js";

/**
 * {investorsTotal, investorsNew7d, activeInvestors7d, deckOpens7d,
 * downloads7d, series: [{date, signups, activeInvestors}] oldest first,
 * latestEvents: newest first}.
 * @param {import("../db.js").Db} db
 */
async function overviewOf(db) {
  const [counts, series, latest] = await Promise.all([
    db.query(COUNTS_SQL, [WINDOW_DAYS]),
    db.query(SERIES_SQL, [SERIES_DAYS]),
    db.query(LATEST_EVENTS_SQL, [LATEST_EVENTS]),
  ]);
  return {
    ...toCounts(counts.rows[0]),
    series: series.rows.map(toSeriesDay),
    latestEvents: latest.rows.map(toLatestEvent),
  };
}

/** @param {{db: import("../db.js").Db}} deps */
export function createAdminOverviewRouter({ db }) {
  const router = express.Router();
  router.get("/admin/overview", async function getOverview(_req, res, next) {
    try {
      return res.json(await overviewOf(db));
    } catch (err) {
      return next(err);
    }
  });
  return router;
}
