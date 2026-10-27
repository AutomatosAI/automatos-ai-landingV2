import { readdirSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MIGRATIONS_DIR, MIGRATION_LOCK_KEY, MigrationError, listMigrationFiles, runMigrations } from "../migrate.js";
import { createTestDb } from "./helpers/test-db.js";

const TABLES = ["alerts_sent", "documents", "events", "investors", "schema_migrations", "sections", "sessions"];
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";
/** Every shipped migration, in order (read here, not through listMigrationFiles, which is under test). */
const SHIPPED = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql")).sort();

/** @param {import("../db.js").Db} db */
async function addInvestor(db, clerkUserId = "user_ada", extra = {}) {
  const { rows } = await db.query(
    "INSERT INTO investors.investors (clerk_user_id, email, name, firm, investor_type) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [clerkUserId, "ada@example.com", "Ada Example", "Example Ventures", extra.investorType ?? "angel"],
  );
  return rows[0];
}

/** @param {import("../db.js").Db} db */
async function addDocument(db, title = "Example deck") {
  const { rows } = await db.query("INSERT INTO investors.documents (title, kind) VALUES ($1, 'pdf') RETURNING *", [title]);
  return rows[0];
}

/** @param {import("../db.js").Db} db @param {string} table */
async function countRows(db, table, investorId) {
  const { rows } = await db.query(`SELECT count(*) AS n FROM investors.${table} WHERE investor_id = $1`, [investorId]);
  return rows[0].n;
}

/** @param {import("../db.js").Db} db */
async function appliedNames(db) {
  const { rows } = await db.query("SELECT name FROM investors.schema_migrations ORDER BY name");
  return rows.map((row) => row.name);
}

/** @param {Record<string, string>} files */
async function migrationsDir(files) {
  const dir = await mkdtemp(join(tmpdir(), "investors-migrations-"));
  await Promise.all(Object.entries(files).map(([name, sql]) => writeFile(join(dir, name), sql)));
  return dir;
}

describe("runMigrations: the shipped migrations", () => {
  /** @type {import("../db.js").Db} */
  let db;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(() => db.end());

  it("applies every shipped file, 001 first, to a fresh database and creates every table in schema investors", async () => {
    expect(SHIPPED[0]).toBe("001_init.sql");
    await expect(runMigrations(db)).resolves.toEqual(SHIPPED);
    const { rows } = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
      ["investors"],
    );
    expect(rows.map((row) => row.table_name)).toEqual(TABLES);
    expect(await appliedNames(db)).toEqual(SHIPPED);
  });

  it("applies nothing on a second run", async () => {
    const applied = await runMigrations(db);
    expect(applied).toEqual([]);
    expect(Object.isFrozen(applied)).toBe(true);
    expect(await appliedNames(db)).toEqual(SHIPPED);
  });

  it("applies each file once when two runs race (advisory lock, re-checked inside it)", async () => {
    const both = await Promise.all([runMigrations(db), runMigrations(db)]);
    expect(both).toEqual([[], []]);
    expect(await appliedNames(db)).toEqual(SHIPPED);
  });

  it("creates the three events indexes and the alerts_sent once-index", async () => {
    const { rows } = await db.query("SELECT indexname FROM pg_indexes WHERE schemaname = $1", ["investors"]);
    const names = rows.map((row) => row.indexname);
    expect(names).toEqual(
      expect.arrayContaining([
        "events_investor_created_idx",
        "events_document_type_idx",
        "events_type_created_idx",
        "alerts_sent_once_idx",
      ]),
    );
  });

  it("fills the defaults: flags false, version 1, timestamps set", async () => {
    const investor = await addInvestor(db, "user_defaults");
    expect(investor).toMatchObject({ marketing_opt_in: false, blocked: false, profile_completed_at: null });
    expect(investor.created_at).toBeInstanceOf(Date);
    expect(investor.last_seen_at).toBeInstanceOf(Date);
    const doc = await addDocument(db);
    expect(doc).toMatchObject({ version: 1, sort_order: 0, published: false, alert_on_first_open: false });
  });

  it("rejects a value outside a CHECK list (investor_type, cheque_size, source, kind, event type)", async () => {
    await expect(addInvestor(db, "user_bad_type", { investorType: "hedge_fund" })).rejects.toMatchObject({
      code: CHECK_VIOLATION,
    });
    const investor = await addInvestor(db, "user_checks");
    const bad = [
      ["UPDATE investors.investors SET cheque_size = $1 WHERE id = $2", ["huge", investor.id]],
      ["UPDATE investors.investors SET source = $1 WHERE id = $2", ["cold_email", investor.id]],
      ["INSERT INTO investors.documents (title, kind) VALUES ($1, $2)", ["Untitled", "exe"]],
      ["INSERT INTO investors.events (investor_id, type) VALUES ($1, $2)", [investor.id, "login"]],
      ["INSERT INTO investors.alerts_sent (investor_id, kind) VALUES ($1, $2)", [investor.id, "weekly"]],
    ];
    for (const [text, params] of bad) {
      await expect(db.query(text, params)).rejects.toMatchObject({ code: CHECK_VIOLATION });
    }
  });

  it("caps duration_ms at 600000 and allows 0", async () => {
    const investor = await addInvestor(db, "user_duration");
    const insert = "INSERT INTO investors.events (investor_id, type, page, duration_ms) VALUES ($1, 'page_view', 1, $2)";
    await expect(db.query(insert, [investor.id, 600_001])).rejects.toMatchObject({ code: CHECK_VIOLATION });
    await expect(db.query(insert, [investor.id, -1])).rejects.toMatchObject({ code: CHECK_VIOLATION });
    await expect(db.query(insert, [investor.id, 0])).resolves.toMatchObject({ rowCount: 1 });
    await expect(db.query(insert, [investor.id, 600_000])).resolves.toMatchObject({ rowCount: 1 });
  });

  it("keeps clerk_user_id unique", async () => {
    await addInvestor(db, "user_twice");
    await expect(addInvestor(db, "user_twice")).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
  });

  it("records an alert once per (investor, kind, document), a NULL document counting as equal", async () => {
    const investor = await addInvestor(db, "user_alerts");
    const [deck, plan] = [await addDocument(db, "Deck"), await addDocument(db, "Plan")];
    const once = "INSERT INTO investors.alerts_sent (investor_id, kind, document_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING";
    const results = [
      await db.query(once, [investor.id, "signup", null]),
      await db.query(once, [investor.id, "signup", null]),
      await db.query(once, [investor.id, "first_open", deck.id]),
      await db.query(once, [investor.id, "first_open", deck.id]),
      await db.query(once, [investor.id, "first_open", plan.id]),
    ];
    expect(results.map((result) => result.rowCount)).toEqual([1, 0, 1, 0, 1]);
  });

  it("cascades an investor delete to sessions, events and alerts_sent", async () => {
    const investor = await addInvestor(db, "user_cascade");
    const other = await addInvestor(db, "user_kept");
    const doc = await addDocument(db);
    for (const who of [investor, other]) {
      const session = await db.query("INSERT INTO investors.sessions (investor_id) VALUES ($1) RETURNING id", [who.id]);
      await db.query(
        "INSERT INTO investors.events (investor_id, session_id, type, document_id, document_version) VALUES ($1, $2, 'document_open', $3, 1)",
        [who.id, session.rows[0].id, doc.id],
      );
      await db.query("INSERT INTO investors.alerts_sent (investor_id, kind) VALUES ($1, 'signup')", [who.id]);
    }
    await db.query("DELETE FROM investors.investors WHERE id = $1", [investor.id]);
    for (const table of ["sessions", "events", "alerts_sent"]) {
      expect(await countRows(db, table, investor.id)).toBe(0);
      expect(await countRows(db, table, other.id)).toBe(1);
    }
  });

  it("keeps events when their document is deleted (document_id SET NULL) and drops its first-open alerts", async () => {
    const investor = await addInvestor(db, "user_doc_delete");
    const doc = await addDocument(db);
    await db.query("INSERT INTO investors.events (investor_id, type, document_id) VALUES ($1, 'document_open', $2)", [
      investor.id,
      doc.id,
    ]);
    await db.query("INSERT INTO investors.alerts_sent (investor_id, kind, document_id) VALUES ($1, 'first_open', $2)", [
      investor.id,
      doc.id,
    ]);
    await db.query("DELETE FROM investors.documents WHERE id = $1", [doc.id]);
    const { rows } = await db.query("SELECT document_id FROM investors.events WHERE investor_id = $1", [investor.id]);
    expect(rows).toEqual([{ document_id: null }]);
    expect(await countRows(db, "alerts_sent", investor.id)).toBe(0);
  });

  it("returns int8 values as numbers, as db.js does over pg", async () => {
    const { rows } = await db.query("SELECT count(*) AS n, 262144000::bigint AS size");
    expect(typeof rows[0].n).toBe("number");
    expect(rows[0].size).toBe(262_144_000);
  });
});

describe("runMigrations: failures and an existing schema", () => {
  /** @type {import("../db.js").Db} */
  let db;
  /** @type {string[]} */
  const dirs = [];
  beforeEach(async () => {
    db = await createTestDb();
  });
  afterEach(async () => {
    await db.end();
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function dirWith(files) {
    const dir = await migrationsDir(files);
    dirs.push(dir);
    return dir;
  }

  it("rolls a broken file back, leaves it unrecorded, and names it", async () => {
    const dir = await dirWith({
      "001_ok.sql": "CREATE TABLE investors.ok_table (id int);",
      "002_broken.sql": "CREATE TABLE investors.half_table (id int);\nSELECT no_such_column FROM investors.ok_table;",
    });
    const failure = await runMigrations(db, dir).catch((err) => err);
    expect(failure).toBeInstanceOf(MigrationError);
    expect(failure.file).toBe("002_broken.sql");
    expect(failure.message).toContain("002_broken.sql");
    expect(await appliedNames(db)).toEqual(["001_ok.sql"]);
    const { rows } = await db.query("SELECT to_regclass($1) AS half, to_regclass($2) AS ok", [
      "investors.half_table",
      "investors.ok_table",
    ]);
    expect(rows[0]).toEqual({ half: null, ok: "investors.ok_table" });
  });

  it("applies the fixed file on the next run", async () => {
    const dir = await dirWith({ "001_broken.sql": "SELECT 1 FROM investors.nowhere;" });
    await expect(runMigrations(db, dir)).rejects.toBeInstanceOf(MigrationError);
    await writeFile(join(dir, "001_broken.sql"), "CREATE TABLE investors.fixed (id int);");
    await expect(runMigrations(db, dir)).resolves.toEqual(["001_broken.sql"]);
  });

  it("does not issue CREATE SCHEMA when the schema already exists, and takes the advisory lock", async () => {
    await db.query("CREATE SCHEMA investors");
    const statements = [];
    const record = (client) => ({
      query: (text, params) => {
        statements.push({ text, params });
        return client.query(text, params);
      },
      exec: (script) => {
        statements.push({ text: script });
        return client.exec(script);
      },
    });
    const recorded = { ...db, tx: (fn) => db.tx((client) => fn(record(client))) };
    await expect(runMigrations(recorded)).resolves.toEqual(SHIPPED);
    expect(statements.some(({ text }) => /CREATE SCHEMA/i.test(text))).toBe(false);
    const locks = statements.filter(({ text }) => text.includes("pg_advisory_xact_lock"));
    // One for the bootstrap, one per file.
    expect(locks).toHaveLength(1 + SHIPPED.length);
    expect(locks.every(({ params }) => params?.[0] === MIGRATION_LOCK_KEY)).toBe(true);
  });

  it("fails as 'bootstrap' when the database cannot be reached", async () => {
    const unreachable = { ...db, tx: async () => Promise.reject(new Error("connect ECONNREFUSED")) };
    await expect(runMigrations(unreachable)).rejects.toMatchObject({ name: "MigrationError", file: "bootstrap" });
  });
});

describe("listMigrationFiles", () => {
  /** @type {string[]} */
  const dirs = [];
  afterAll(() => Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true }))));

  async function dirWith(files) {
    const dir = await migrationsDir(files);
    dirs.push(dir);
    return dir;
  }

  it("sorts the .sql files and ignores everything else", async () => {
    const dir = await dirWith({ "010_b.sql": "", "002_a.sql": "", "README.md": "", "001_init.sql": "" });
    await expect(listMigrationFiles(dir)).resolves.toEqual(["001_init.sql", "002_a.sql", "010_b.sql"]);
  });

  it.each([
    [{ "1_init.sql": "" }, "1_init.sql"],
    [{ "001-init.sql": "" }, "001-init.sql"],
    [{ "001_Init.sql": "" }, "001_Init.sql"],
    [{ "001_a.sql": "", "001_b.sql": "" }, "001_b.sql"],
  ])("rejects %o, naming %s", async (files, file) => {
    const dir = await dirWith(files);
    await expect(listMigrationFiles(dir)).rejects.toMatchObject({ name: "MigrationError", file });
  });
});
