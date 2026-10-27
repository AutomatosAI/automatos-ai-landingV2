import { describe, expect, it, vi } from "vitest";
import { POOL_OPTIONS, createDb } from "../db.js";

const URL = "postgres://portal@localhost:5432/test";

/**
 * A stand-in for pg.Pool: records what db.js asks of it and never opens a
 * socket. `failOn` makes the statement with that text reject.
 */
function fakePoolClass({ failOn = new Set() } = {}) {
  const log = { options: null, statements: [], released: [], listeners: {}, ended: false };
  const run = async (text) => {
    log.statements.push(text);
    if (failOn.has(text)) throw new Error(`${text} failed`);
    return { rows: [{ text }], rowCount: 1 };
  };
  class FakePool {
    constructor(options) {
      log.options = options;
    }
    on(event, listener) {
      log.listeners[event] = listener;
      return this;
    }
    query(text, params) {
      log.statements.push(params ? { text, params } : text);
      return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
    }
    async connect() {
      return { query: run, release: (destroy) => log.released.push(destroy) };
    }
    async end() {
      log.ended = true;
    }
  }
  return { FakePool, log };
}

function quietLogger() {
  return { warn: vi.fn(), error: vi.fn() };
}

describe("createDb: the pool", () => {
  it("opens pg.Pool with max 5 and idleTimeoutMillis 30000 and the given connection string", () => {
    const { FakePool, log } = fakePoolClass();
    createDb({ connectionString: URL, Pool: FakePool, logger: quietLogger() });
    expect(log.options).toMatchObject({ max: 5, idleTimeoutMillis: 30_000, connectionString: URL });
    expect(POOL_OPTIONS).toMatchObject({ max: 5, idleTimeoutMillis: 30_000 });
    expect(Object.isFrozen(POOL_OPTIONS)).toBe(true);
  });

  it("parses int8 as a number per pool and leaves other types to pg", () => {
    const { FakePool, log } = fakePoolClass();
    createDb({ connectionString: URL, Pool: FakePool, logger: quietLogger() });
    const parseInt8 = log.options.types.getTypeParser(20, "text");
    expect(parseInt8("262144000")).toBe(262_144_000);
    const parseBool = log.options.types.getTypeParser(16, "text");
    expect(parseBool("t")).toBe(true);
  });

  it("logs an idle client's error instead of letting it crash the process", () => {
    const { FakePool, log } = fakePoolClass();
    const logger = quietLogger();
    createDb({ connectionString: URL, Pool: FakePool, logger });
    expect(typeof log.listeners.error).toBe("function");
    log.listeners.error(new Error("terminating connection due to administrator command"));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("terminating connection"));
  });

  it("builds a real pg.Pool lazily: no connection until the first query, and end() resolves", async () => {
    const db = createDb({ connectionString: URL, logger: quietLogger() });
    await expect(db.end()).resolves.toBeUndefined();
  });

  it("exposes query, tx and end only, frozen; query returns {rows, rowCount}; end closes the pool", async () => {
    const { FakePool, log } = fakePoolClass();
    const db = createDb({ connectionString: URL, Pool: FakePool, logger: quietLogger() });
    expect(Object.keys(db).sort()).toEqual(["end", "query", "tx"]);
    expect(Object.isFrozen(db)).toBe(true);
    await expect(db.query("SELECT $1::int AS id", [1])).resolves.toEqual({ rows: [{ id: 1 }], rowCount: 1 });
    expect(log.statements).toEqual([{ text: "SELECT $1::int AS id", params: [1] }]);
    await db.end();
    expect(log.ended).toBe(true);
  });
});

describe("createDb: tx", () => {
  it("runs BEGIN, the work and COMMIT on one client, then releases it", async () => {
    const { FakePool, log } = fakePoolClass();
    const db = createDb({ connectionString: URL, Pool: FakePool, logger: quietLogger() });
    const value = await db.tx(async (client) => {
      const { rows } = await client.query("SELECT 1");
      await client.exec("CREATE TABLE a (); CREATE TABLE b ();");
      return rows[0].text;
    });
    expect(value).toBe("SELECT 1");
    expect(log.statements).toEqual(["BEGIN", "SELECT 1", "CREATE TABLE a (); CREATE TABLE b ();", "COMMIT"]);
    expect(log.released).toEqual([false]);
  });

  it("rolls back and rethrows when the work throws, and still releases the client", async () => {
    const { FakePool, log } = fakePoolClass();
    const db = createDb({ connectionString: URL, Pool: FakePool, logger: quietLogger() });
    const boom = new Error("boom");
    await expect(db.tx(async () => Promise.reject(boom))).rejects.toBe(boom);
    expect(log.statements).toEqual(["BEGIN", "ROLLBACK"]);
    expect(log.released).toEqual([false]);
  });

  it("rolls back when COMMIT fails", async () => {
    const { FakePool, log } = fakePoolClass({ failOn: new Set(["COMMIT"]) });
    const db = createDb({ connectionString: URL, Pool: FakePool, logger: quietLogger() });
    await expect(db.tx(async () => "done")).rejects.toThrow("COMMIT failed");
    expect(log.statements).toEqual(["BEGIN", "COMMIT", "ROLLBACK"]);
  });

  it("destroys the connection and logs when ROLLBACK fails, rethrowing the original error", async () => {
    const { FakePool, log } = fakePoolClass({ failOn: new Set(["ROLLBACK"]) });
    const logger = quietLogger();
    const db = createDb({ connectionString: URL, Pool: FakePool, logger });
    const boom = new Error("boom");
    await expect(db.tx(async () => Promise.reject(boom))).rejects.toBe(boom);
    expect(log.released).toEqual([true]);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("ROLLBACK failed"));
  });
});
