/**
 * Investor portal migrations (KP8): numbered plain SQL files, NNN_name.sql,
 * applied in order. Never edit a file that has shipped; add the next number.
 *
 * Every step holds one transaction-scoped advisory lock, so two instances
 * booting together (a deploy overlapping the old container) apply each file
 * once. The schema is created only when pg_namespace lacks it: in
 * production it already exists, owned by the portal's role, which may not
 * hold CREATE on the database (CREATE SCHEMA IF NOT EXISTS would still ask
 * for that privilege).
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const MIGRATIONS_DIR = fileURLToPath(new URL("./migrations/", import.meta.url));
export const MIGRATION_LOCK_KEY = 724001;

const FILE_PATTERN = /^(\d{3})_[a-z0-9_]+\.sql$/;
const BOOTSTRAP_STEP = "bootstrap";

/** A failed step; `file` is the migration file name, or 'bootstrap'. */
export class MigrationError extends Error {
  /** @param {string} file @param {unknown} cause */
  constructor(file, cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`migration ${file} failed: ${detail}`, { cause });
    this.name = "MigrationError";
    this.file = file;
  }
}

/** @param {import("./db.js").TxClient} client */
async function lock(client) {
  await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);
}

/** @param {import("./db.js").Db} db */
async function bootstrap(db) {
  await db.tx(async (client) => {
    await lock(client);
    const { rows } = await client.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", ["investors"]);
    if (rows.length === 0) await client.exec("CREATE SCHEMA investors");
    await client.exec(
      "CREATE TABLE IF NOT EXISTS investors.schema_migrations (" +
        "name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
  });
}

/**
 * The .sql files in dir, sorted. A misnamed .sql file or a reused number
 * fails the run rather than being skipped or applied out of order.
 * @param {string} dir
 * @returns {Promise<readonly string[]>}
 */
export async function listMigrationFiles(dir) {
  const names = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
  const misnamed = names.find((name) => !FILE_PATTERN.test(name));
  if (misnamed) throw new MigrationError(misnamed, "the name must match NNN_name.sql");
  const numbers = names.map((name) => name.slice(0, 3));
  const reused = names.find((_name, i) => i > 0 && numbers[i] === numbers[i - 1]);
  if (reused) throw new MigrationError(reused, "its number is used by another file");
  return Object.freeze(names);
}

/**
 * Applies one file in its own transaction unless it is already recorded.
 * @param {import("./db.js").Db} db
 * @param {string} dir
 * @param {string} name
 * @returns {Promise<boolean>} true when this call applied it
 */
async function applyFile(db, dir, name) {
  const script = await readFile(join(dir, name), "utf8");
  return db.tx(async (client) => {
    await lock(client);
    const done = await client.query("SELECT 1 FROM investors.schema_migrations WHERE name = $1", [name]);
    if (done.rows.length > 0) return false;
    await client.exec(script);
    await client.query("INSERT INTO investors.schema_migrations (name) VALUES ($1)", [name]);
    return true;
  });
}

/**
 * @param {import("./db.js").Db} db
 * @param {string} [dir]
 * @returns {Promise<readonly string[]>} the files applied by this run, in order
 * @throws {MigrationError} naming the file that failed (rolled back, not recorded)
 */
export async function runMigrations(db, dir = MIGRATIONS_DIR) {
  await bootstrap(db).catch((err) => {
    throw new MigrationError(BOOTSTRAP_STEP, err);
  });
  const files = await listMigrationFiles(dir).catch((err) => {
    throw err instanceof MigrationError ? err : new MigrationError(BOOTSTRAP_STEP, err);
  });
  const applied = [];
  for (const name of files) {
    const ran = await applyFile(db, dir, name).catch((err) => {
      throw new MigrationError(name, err);
    });
    if (ran) applied.push(name);
  }
  return Object.freeze(applied);
}
