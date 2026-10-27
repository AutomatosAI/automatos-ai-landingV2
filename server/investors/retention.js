/**
 * Retention: an investor not seen for RETENTION_MONTHS is deleted with
 * everything recorded about them (sessions, events and sent alerts go with
 * the row: ON DELETE CASCADE in 001_init.sql). The privacy policy's
 * "Investor portal" section states the same period; change both together.
 *
 * start() runs a purge once the database is ready, then once a day. A failed
 * purge is logged and retried at the next tick; it never stops the portal.
 * The Clerk account is not touched: someone who signs in again starts fresh.
 */

export const RETENTION_MONTHS = 6;
export const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes every investor whose last visit is older than `months`
 * (last_seen_at is NOT NULL, set at sign-up and on every request).
 * @param {Pick<import("./db.js").Db, "query">} db
 * @param {{months?: number}} [options]
 * @returns {Promise<number>} how many investors were deleted
 */
export async function purgeInactiveInvestors(db, { months = RETENTION_MONTHS } = {}) {
  if (!Number.isInteger(months) || months < 1) throw new RangeError(`retention months must be a positive integer: ${months}`);
  const { rowCount } = await db.query(
    `DELETE FROM investors.investors
      WHERE last_seen_at < now() - make_interval(months => $1::int)`,
    [months],
  );
  return rowCount;
}

/**
 * Runs the purge now and then every `intervalMs`. The timer is unref'd, so it
 * never keeps the process alive.
 * @param {{db: Pick<import("./db.js").Db, "query">, logger: import("./db.js").Logger,
 *   months?: number, intervalMs?: number, setIntervalFn?: typeof setInterval}} options
 * @returns {{runOnce: () => Promise<number | null>, stop: () => void}}
 */
export function scheduleRetention({ db, logger, months = RETENTION_MONTHS, intervalMs = RETENTION_INTERVAL_MS, setIntervalFn = setInterval }) {
  const runOnce = async () => {
    try {
      const deleted = await purgeInactiveInvestors(db, { months });
      if (deleted > 0) logger.warn(`[investors] retention: deleted ${deleted} investor(s) not seen for ${months} months`);
      return deleted;
    } catch (err) {
      logger.error(`[investors] retention purge failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  };
  const timer = setIntervalFn(() => {
    void runOnce();
  }, intervalMs);
  timer?.unref?.();
  void runOnce();
  return Object.freeze({ runOnce, stop: () => clearInterval(timer) });
}
