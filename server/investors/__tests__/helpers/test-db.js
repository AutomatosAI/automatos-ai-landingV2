/**
 * A test database with db.js's interface (KP7).
 *
 * Default: a fresh in-memory PGlite per call (real Postgres, in-process).
 * With INVESTORS_TEST_DATABASE_URL set (CI's Postgres service): db.js over
 * pg, with the investors schema dropped first. That database is shared, so
 * vitest.config.js runs test files one at a time in that mode, and a test
 * file holds at most one test database at a time.
 */
import { PGlite } from "@electric-sql/pglite";
import { createDb } from "../../db.js";

/** @param {{rows?: Record<string, any>[], rowCount?: number, affectedRows?: number}} result */
function toResult(result) {
  const rows = result.rows ?? [];
  return { rows, rowCount: result.rowCount ?? result.affectedRows ?? rows.length };
}

/**
 * @param {Pick<import("@electric-sql/pglite").Transaction, "query" | "exec">} target
 * @returns {import("../../db.js").TxClient}
 */
function wrap(target) {
  return Object.freeze({
    query: async (text, params) => toResult(await target.query(text, params)),
    exec: async (script) => {
      await target.exec(script);
    },
  });
}

/** @returns {Promise<Readonly<import("../../db.js").Db>>} */
async function createPgliteDb() {
  const lite = new PGlite();
  await lite.waitReady;
  return Object.freeze({
    query: wrap(lite).query,
    tx: (fn) => lite.transaction((tx) => fn(wrap(tx))),
    end: () => lite.close(),
  });
}

/** @param {string} connectionString */
async function createPgDb(connectionString) {
  const db = createDb({ connectionString });
  await db.query("DROP SCHEMA IF EXISTS investors CASCADE");
  return db;
}

/** @returns {Promise<Readonly<import("../../db.js").Db>>} */
export function createTestDb() {
  const url = process.env.INVESTORS_TEST_DATABASE_URL;
  return url ? createPgDb(url) : createPgliteDb();
}
