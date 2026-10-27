/**
 * Investor portal database access (KP7).
 *
 * The only module that talks to Postgres. Every statement is parameterized
 * ($1..$n) and schema-qualified (investors.<table>). Tests get the same
 * interface over PGlite from __tests__/helpers/test-db.js, so anything a
 * route relies on must behave the same in both: rows are plain objects,
 * int8 columns (count(*), bigserial, size_bytes) come back as numbers,
 * timestamptz as Date, numeric as string, and errors carry Postgres's
 * SQLSTATE in `code`.
 */
import pg from "pg";

/** The pool shares the academy Postgres server: keep its footprint small. */
export const POOL_OPTIONS = Object.freeze({
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  application_name: "automatos-investors",
});

const INT8_OID = 20;

/** pg returns int8 as a string; PGlite (the test database) as a number. */
const parseInt8 = (value) => Number(value);

/** Per-pool type parsers, leaving pg's global defaults untouched. */
const TYPES = Object.freeze({
  getTypeParser: (oid, format) =>
    oid === INT8_OID && format !== "binary" ? parseInt8 : pg.types.getTypeParser(oid, format),
});

/**
 * @typedef {{rows: Record<string, any>[], rowCount: number}} QueryResult
 * @typedef {(text: string, params?: unknown[]) => Promise<QueryResult>} QueryFn
 * @typedef {object} TxClient
 * @property {QueryFn} query
 * @property {(script: string) => Promise<void>} exec runs an unparameterized
 *   multi-statement script; for migration files only, never request data
 * @typedef {object} Db
 * @property {QueryFn} query
 * @property {<T>(fn: (client: TxClient) => Promise<T>) => Promise<T>} tx
 *   BEGIN, fn, COMMIT on one connection; ROLLBACK and rethrow when fn throws.
 *   Inside fn, use only the client it is given.
 * @property {() => Promise<void>} end
 * @typedef {{warn: (...args: unknown[]) => void, error: (...args: unknown[]) => void}} Logger
 */

/**
 * @param {{rows?: Record<string, any>[], rowCount?: number | null}} result
 * @returns {QueryResult}
 */
function toResult(result) {
  const rows = result.rows ?? [];
  return { rows, rowCount: result.rowCount ?? rows.length };
}

/** @param {import("pg").PoolClient} client @returns {TxClient} */
function wrapClient(client) {
  return Object.freeze({
    query: async (text, params) => toResult(await client.query(text, params)),
    exec: async (script) => {
      await client.query(script);
    },
  });
}

/**
 * @param {import("pg").Pool} pool
 * @param {Logger} logger
 * @returns {Db["tx"]}
 */
function makeTx(pool, logger) {
  return async (fn) => {
    const client = await pool.connect();
    // A failed ROLLBACK leaves the connection unusable: release(true) destroys it.
    let destroy = false;
    try {
      await client.query("BEGIN");
      const value = await fn(wrapClient(client));
      await client.query("COMMIT");
      return value;
    } catch (err) {
      await client.query("ROLLBACK").catch((rollbackErr) => {
        logger.error(`[investors] ROLLBACK failed, discarding the connection: ${rollbackErr.message}`);
        destroy = true;
      });
      throw err;
    } finally {
      client.release(destroy);
    }
  };
}

/**
 * @param {{connectionString: string, logger?: Logger, Pool?: typeof pg.Pool}} options
 * @returns {Readonly<Db>}
 */
export function createDb({ connectionString, logger = console, Pool = pg.Pool }) {
  const pool = new Pool({ ...POOL_OPTIONS, connectionString, types: TYPES });
  // An idle client's error is emitted on the pool; unhandled, it would crash the site (KP4).
  pool.on("error", (err) => logger.error(`[investors] idle database client error: ${err.message}`));
  return Object.freeze({
    query: async (text, params) => toResult(await pool.query(text, params)),
    tx: makeTx(pool, logger),
    end: () => pool.end(),
  });
}
