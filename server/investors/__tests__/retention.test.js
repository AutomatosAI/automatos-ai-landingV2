import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../migrate.js";
import { RETENTION_MONTHS, purgeInactiveInvestors, scheduleRetention } from "../retention.js";
import { insertDocument, insertEvents, insertInvestor, insertSessions, pageView } from "./helpers/investor-fixtures.js";
import { createTestDb } from "./helpers/test-db.js";

const DAYS_PER_MONTH_MAX = 31;

/** @param {import("../db.js").Db} db @param {string} table @param {string} investorId */
async function countFor(db, table, investorId) {
  const { rows } = await db.query(`SELECT count(*)::int AS n FROM investors.${table} WHERE investor_id = $1`, [investorId]);
  return rows[0].n;
}

describe("retention", () => {
  /** @type {import("../db.js").Db} */
  let db;

  beforeEach(async () => {
    db = await createTestDb();
    await runMigrations(db);
  });

  afterEach(async () => {
    await db.end();
  });

  it("keeps six months by default", () => {
    expect(RETENTION_MONTHS).toBe(6);
  });

  it("deletes investors not seen for longer than the period, with their sessions and events", async () => {
    const doc = await insertDocument(db);
    const stale = await insertInvestor(db, { createdDaysAgo: 400, lastSeenDaysAgo: 7 * DAYS_PER_MONTH_MAX });
    const recent = await insertInvestor(db, { createdDaysAgo: 400, lastSeenDaysAgo: 30 });
    for (const id of [stale, recent]) {
      await insertSessions(db, id, 2);
      await insertEvents(db, id, [pageView(doc, 1), pageView(doc, 2)]);
    }

    expect(await purgeInactiveInvestors(db)).toEqual({ deleted: 1, scrubbed: 0 });

    const { rows } = await db.query("SELECT id FROM investors.investors ORDER BY id");
    expect(rows.map((row) => row.id)).toEqual([recent]);
    expect(await countFor(db, "sessions", stale)).toBe(0);
    expect(await countFor(db, "events", stale)).toBe(0);
    expect(await countFor(db, "events", recent)).toBe(2);
  });

  it("keeps someone seen just inside the period and deletes someone just outside it", async () => {
    const inside = await insertInvestor(db, { createdDaysAgo: 300, lastSeenDaysAgo: 5 * 28 });
    const outside = await insertInvestor(db, { createdDaysAgo: 300, lastSeenDaysAgo: 6 * DAYS_PER_MONTH_MAX + 2 });

    await purgeInactiveInvestors(db);

    const { rows } = await db.query("SELECT id FROM investors.investors");
    const ids = rows.map((row) => row.id);
    expect(ids).toContain(inside);
    expect(ids).not.toContain(outside);
  });

  it("keeps a minimal row for a blocked investor so the block survives, and clears everything else", async () => {
    const doc = await insertDocument(db);
    const blocked = await insertInvestor(db, { createdDaysAgo: 400, lastSeenDaysAgo: 7 * DAYS_PER_MONTH_MAX, marketingOptIn: true });
    await db.query("UPDATE investors.investors SET blocked = true WHERE id = $1", [blocked]);
    await insertSessions(db, blocked, 2);
    await insertEvents(db, blocked, [pageView(doc, 1)]);

    expect(await purgeInactiveInvestors(db)).toEqual({ deleted: 0, scrubbed: 1 });

    const { rows } = await db.query("SELECT * FROM investors.investors WHERE id = $1", [blocked]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ blocked: true, email: "", name: null, firm: null, marketing_opt_in: false, profile_completed_at: null });
    expect(rows[0].clerk_user_id).toMatch(/^user_fixture_/);
    expect(await countFor(db, "sessions", blocked)).toBe(0);
    expect(await countFor(db, "events", blocked)).toBe(0);
    expect(await purgeInactiveInvestors(db)).toEqual({ deleted: 0, scrubbed: 0 });
  });

  it("honours a shorter period and refuses a nonsense one", async () => {
    await insertInvestor(db, { createdDaysAgo: 100, lastSeenDaysAgo: 2 * DAYS_PER_MONTH_MAX + 2 });

    expect(await purgeInactiveInvestors(db, { months: 2 })).toEqual({ deleted: 1, scrubbed: 0 });
    await expect(purgeInactiveInvestors(db, { months: 0 })).rejects.toThrow(RangeError);
    await expect(purgeInactiveInvestors(db, { months: 1.5 })).rejects.toThrow(RangeError);
  });

  it("runs at once and on every tick, logs a failure and keeps going", async () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    /** @type {(() => void) | null} */
    let tick = null;
    const setIntervalFn = /** @type {typeof setInterval} */ (
      /** @type {unknown} */ ((fn) => {
        tick = fn;
        return { unref() {} };
      })
    );
    let calls = 0;
    const flakyDb = {
      tx: async (fn) => {
        calls += 1;
        if (calls === 1) throw new Error("connection reset");
        return fn({ query: async (text) => ({ rows: [], rowCount: text.startsWith("DELETE FROM investors.investors") ? 3 : 0 }) });
      },
    };

    const job = scheduleRetention({ db: flakyDb, logger, setIntervalFn });
    await vi.waitFor(() => expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("connection reset")));

    tick?.();
    await vi.waitFor(() => expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("deleted 3 investor(s)")));
    expect(await job.runOnce()).toEqual({ deleted: 3, scrubbed: 0 });
    job.stop();
  });
});
