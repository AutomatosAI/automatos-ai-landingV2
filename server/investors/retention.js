/**
 * Retention: an investor not seen for RETENTION_MONTHS is deleted with
 * everything recorded about them (sessions, events and sent alerts go with
 * the row: ON DELETE CASCADE in 001_init.sql). A BLOCKED investor keeps only
 * a minimal row so the block survives. The privacy policy's "Investor
 * portal" section states the same; change both together.
 *
 * start() runs a purge once the database is ready, then once a day. A failed
 * purge is logged and retried at the next tick; it never stops the portal.
 * The Clerk account is not touched: someone who signs in again starts fresh.
 */

export const RETENTION_MONTHS = 6;
export const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

const STALE = "last_seen_at < now() - make_interval(months => $1::int)";

/**
 * Applies retention to every investor whose last visit is older than `months`
 * (last_seen_at is NOT NULL, set at sign-up and on every request), in one
 * transaction:
 * - not blocked: the row is deleted; sessions, events and sent alerts cascade;
 * - blocked: the tracking data and every profile detail are deleted, but a
 *   minimal row (the Clerk id and the block) stays, so the person cannot come
 *   back as a fresh investor once the purge has run.
 * @param {Pick<import("./db.js").Db, "tx">} db
 * @param {{months?: number}} [options]
 * @returns {Promise<{deleted: number, scrubbed: number}>}
 */
export async function purgeInactiveInvestors(db, { months = RETENTION_MONTHS } = {}) {
  if (!Number.isInteger(months) || months < 1) throw new RangeError(`retention months must be a positive integer: ${months}`);
  return db.tx(async (client) => {
    const blockedIds = `SELECT id FROM investors.investors WHERE blocked AND ${STALE}`;
    for (const table of ["events", "sessions", "alerts_sent"]) {
      await client.query(`DELETE FROM investors.${table} WHERE investor_id IN (${blockedIds})`, [months]);
    }
    const scrubbed = await client.query(
      `UPDATE investors.investors
          SET email = '', name = NULL, firm = NULL, title = NULL, investor_type = NULL, linkedin_url = NULL,
              cheque_size = NULL, country = NULL, source = NULL, marketing_opt_in = false,
              marketing_opt_in_at = NULL, profile_completed_at = NULL
        WHERE blocked AND ${STALE} AND (email <> '' OR name IS NOT NULL OR firm IS NOT NULL)`,
      [months],
    );
    const deleted = await client.query(`DELETE FROM investors.investors WHERE NOT blocked AND ${STALE}`, [months]);
    return { deleted: deleted.rowCount, scrubbed: scrubbed.rowCount };
  });
}

/**
 * Runs the purge now and then every `intervalMs`. The timer is unref'd, so it
 * never keeps the process alive.
 * @param {{db: Pick<import("./db.js").Db, "tx">, logger: import("./db.js").Logger,
 *   months?: number, intervalMs?: number, setIntervalFn?: typeof setInterval}} options
 * @returns {{runOnce: () => Promise<{deleted: number, scrubbed: number} | null>, stop: () => void}}
 */
export function scheduleRetention({ db, logger, months = RETENTION_MONTHS, intervalMs = RETENTION_INTERVAL_MS, setIntervalFn = setInterval }) {
  const runOnce = async () => {
    try {
      const result = await purgeInactiveInvestors(db, { months });
      if (result.deleted > 0 || result.scrubbed > 0) {
        logger.warn(`[investors] retention (${months} months): deleted ${result.deleted} investor(s), cleared ${result.scrubbed} blocked`);
      }
      return result;
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
