/**
 * Rows written straight into the test database for the admin investor tests
 * (W1-15): investors, documents, sessions and events with chosen times, as
 * the investor side would have left them. Every person, firm and document
 * is invented (KP5).
 */
import { randomUUID } from "node:crypto";
import { documentKey } from "../../s3.js";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** @param {number} ms how long ago */
const ago = (ms) => new Date(Date.now() - ms).toISOString();

/**
 * @param {import("../../db.js").Db} db
 * @param {{name?: string | null, email?: string, firm?: string | null, investorType?: string | null,
 *   chequeSize?: string | null, source?: string | null, createdDaysAgo?: number, lastSeenDaysAgo?: number,
 *   marketingOptIn?: boolean}} [fields]
 * @returns {Promise<string>} the investor id
 */
export async function insertInvestor(db, fields = {}) {
  const id = randomUUID();
  const { name = "Ada Example", firm = "Example Ventures", investorType = "vc", chequeSize = null, source = "websummit" } =
    fields;
  const { email = `${id}@example.com`, createdDaysAgo = 1, lastSeenDaysAgo = 0, marketingOptIn = false } = fields;
  await db.query(
    `INSERT INTO investors.investors (id, clerk_user_id, email, name, firm, investor_type, cheque_size, source,
       created_at, last_seen_at, marketing_opt_in, marketing_opt_in_at, profile_completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CASE WHEN $11 THEN $9::timestamptz END, $9)`,
    [
      id,
      `user_fixture_${id}`,
      email,
      name,
      firm,
      investorType,
      chequeSize,
      source,
      ago(createdDaysAgo * DAY_MS),
      ago(lastSeenDaysAgo * DAY_MS),
      marketingOptIn,
    ],
  );
  return id;
}

/**
 * A published PDF with a file, unless told otherwise.
 * @param {import("../../db.js").Db} db
 * @param {{title?: string, pageCount?: number | null, version?: number, alertOnFirstOpen?: boolean,
 *   sortOrder?: number}} [fields]
 * @returns {Promise<string>} the document id
 */
export async function insertDocument(db, fields = {}) {
  const id = randomUUID();
  const { title = "Example deck", pageCount = 12, version = 1, alertOnFirstOpen = false, sortOrder = 0 } = fields;
  await db.query(
    `INSERT INTO investors.documents (id, title, kind, s3_key, file_name, content_type, page_count, version,
       published, alert_on_first_open, sort_order)
     VALUES ($1, $2, 'pdf', $3, 'Example.pdf', 'application/pdf', $4, $5, true, $6, $7)`,
    [id, title, documentKey(id, version, "Example.pdf"), pageCount, version, alertOnFirstOpen, sortOrder],
  );
  return id;
}

/**
 * @param {import("../../db.js").Db} db
 * @param {string} investorId
 * @param {number} count
 * @returns {Promise<string[]>} the session ids
 */
export async function insertSessions(db, investorId, count) {
  const ids = Array.from({ length: count }, () => randomUUID());
  for (const id of ids) {
    await db.query("INSERT INTO investors.sessions (id, investor_id, user_agent) VALUES ($1, $2, 'Example/1.0')", [
      id,
      investorId,
    ]);
  }
  return ids;
}

/**
 * @typedef {{type: string, documentId?: string, version?: number, page?: number, durationMs?: number,
 *   data?: Record<string, unknown>, sessionId?: string, minutesAgo?: number}} FixtureEvent
 */

/**
 * Events in the order given; minutesAgo sets created_at (default: now).
 * @param {import("../../db.js").Db} db
 * @param {string} investorId
 * @param {readonly FixtureEvent[]} events
 */
export async function insertEvents(db, investorId, events) {
  for (const event of events) {
    await db.query(
      `INSERT INTO investors.events (investor_id, session_id, type, document_id, document_version, page, duration_ms,
         data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        investorId,
        event.sessionId ?? null,
        event.type,
        event.documentId ?? null,
        event.documentId ? (event.version ?? 1) : null,
        event.page ?? null,
        event.durationMs ?? null,
        event.data ? JSON.stringify(event.data) : null,
        ago((event.minutesAgo ?? 0) * MINUTE_MS),
      ],
    );
  }
}

/** n events of one type on a document. @param {string} type @param {string} documentId @param {number} n */
export const repeat = (type, documentId, n) => Array.from({ length: n }, () => ({ type, documentId }));

/** @param {string} documentId @param {number} page @param {number} [durationMs] @param {number} [version] */
export const pageView = (documentId, page, durationMs = 1000, version = 1) => ({
  type: "page_view",
  documentId,
  page,
  durationMs,
  version,
});
