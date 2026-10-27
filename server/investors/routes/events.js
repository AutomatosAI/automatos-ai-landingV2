/**
 * Reading activity (US-010, KP16): POST /sessions opens a visit, POST /events
 * appends a batch of the client's events and keeps the visit alive. Mounted
 * behind requireInvestor (KP3): the investor is req.investor, from the
 * verified token. Nothing in the body says who is reading: zod drops unknown
 * keys, so an investor id sent by a client is never read.
 *
 * The client may send only page_view, section_view and video_progress:
 * document_open and document_download are written by the link route
 * (documents.js). A batch is at most 50 events; the portal's JSON parser
 * (index.js, 64 kB) answers 413 for a bigger body before this router runs.
 * durationMs is clamped to 600000, never refused for being long.
 *
 * What the client cannot know is checked here, and the event dropped (the
 * rest of the batch is kept): a document the investor cannot see (unknown,
 * unpublished or without a file), a version newer than the current one, a
 * page past the current version's page_count (an older version, or a
 * document without a page count, allows 1..2000). A sessionId the investor
 * does not own is ignored: the events are kept without it and the heartbeat
 * is skipped. Sessions store the user agent (300 characters at most) and
 * never an IP address.
 */
import express from "express";
import { z } from "zod";
import { VISIBLE_TO_INVESTORS } from "../documents.js";
import { perInvestorLimit } from "../rate-limit.js";
import { FIELD_CODES, sendInvalid } from "../validation.js";

/** KP16's caps on what a batch may carry. */
export const EVENT_LIMITS = Object.freeze({ batch: 50, durationMs: 600_000, page: 2000, section: 60 });

/** The client's event types (KP16); the database CHECK lists the server's too. */
export const CLIENT_EVENT_TYPES = Object.freeze(["page_view", "section_view", "video_progress"]);
export const VIDEO_PERCENTS = Object.freeze([25, 50, 75, 100]);

/** POST /events requests per investor per minute (KP16). */
export const EVENTS_LIMIT_PER_MINUTE = 120;
/** POST /sessions requests per investor per minute: one per page load is the norm. */
export const SESSIONS_LIMIT_PER_MINUTE = 20;
export const USER_AGENT_MAX_LENGTH = 300;

const SESSIONS_PATH = "/sessions";
const EVENTS_PATH = "/events";

const CREATE_SESSION_SQL = "INSERT INTO investors.sessions (investor_id, user_agent) VALUES ($1, $2) RETURNING id";

const HEARTBEAT_SQL = `
  UPDATE investors.sessions SET last_heartbeat_at = now()
   WHERE id = $1 AND investor_id = $2
  RETURNING id`;

// FOR KEY SHARE: the session cannot go while this batch references it.
const OWNED_SESSION_SQL = "SELECT id FROM investors.sessions WHERE id = $1 AND investor_id = $2 FOR KEY SHARE";

// FOR SHARE, like the link route: an admin's unpublish, replace or delete
// waits for this batch, or this batch waits and reads the row after it.
const DOCUMENTS_SQL = `
  SELECT id, version, page_count FROM investors.documents
   WHERE id IN (SELECT value::uuid FROM jsonb_array_elements_text($1::jsonb)) AND ${VISIBLE_TO_INVESTORS}
     FOR SHARE`;

// One statement for the whole batch: the rows travel as one JSON parameter.
const INSERT_EVENTS_SQL = `
  INSERT INTO investors.events (investor_id, session_id, type, document_id, document_version, page, duration_ms, data)
  SELECT $1::uuid, $2::uuid, e.type, e.document_id, e.document_version, e.page, e.duration_ms, e.data
    FROM jsonb_to_recordset($3::jsonb)
      AS e(type text, document_id uuid, document_version integer, page integer, duration_ms integer, data jsonb)`;

/** Lower case, as Postgres prints a uuid, so ids from the body match ids from a row. */
const uuid = z
  .string()
  .uuid()
  .transform((id) => id.toLowerCase());

const durationMs = z
  .number()
  .int()
  .nonnegative()
  .transform((ms) => Math.min(ms, EVENT_LIMITS.durationMs));

const pageView = z.object({
  type: z.literal("page_view"),
  documentId: uuid,
  documentVersion: z.number().int().positive().optional(),
  page: z.number().int().min(1).max(EVENT_LIMITS.page),
  durationMs,
});

const sectionView = z.object({
  type: z.literal("section_view"),
  section: z.string().regex(/^[a-z0-9_-]+$/).max(EVENT_LIMITS.section),
  durationMs,
});

const videoProgress = z.object({
  type: z.literal("video_progress"),
  documentId: uuid,
  percent: z.number().refine((percent) => VIDEO_PERCENTS.includes(percent)),
});

/** The batch: unknown keys (an investor id among them) are dropped. */
export const batchSchema = z.object({
  sessionId: uuid.optional(),
  heartbeat: z.literal(true).optional(),
  events: z
    .array(z.discriminatedUnion("type", [pageView, sectionView, videoProgress]))
    .max(EVENT_LIMITS.batch, "too_many")
    .default([]),
});

/** Every issue but a too-long batch reads 'invalid' (validation.js field codes). */
const PARSE_OPTIONS = Object.freeze({ errorMap: () => ({ message: FIELD_CODES.invalid }) });

/** @typedef {z.infer<typeof batchSchema>["events"][number]} ClientEvent */
/** @typedef {{id: string, version: number, page_count: number | null}} DocumentFacts */

/**
 * The row for a page_view, or null when the page or version cannot be.
 * @param {Extract<ClientEvent, {type: "page_view"}>} event
 * @param {DocumentFacts} doc
 */
function pageViewRow(event, doc) {
  const version = event.documentVersion ?? doc.version;
  if (version > doc.version) return null;
  const lastPage = version === doc.version && doc.page_count ? doc.page_count : EVENT_LIMITS.page;
  if (event.page > lastPage) return null;
  return { type: event.type, document_id: doc.id, document_version: version, page: event.page, duration_ms: event.durationMs };
}

/**
 * @param {ClientEvent} event
 * @param {ReadonlyMap<string, DocumentFacts>} documents the visible documents the batch names
 */
function toEventRow(event, documents) {
  if (event.type === "section_view") {
    return { type: event.type, duration_ms: event.durationMs, data: { section: event.section } };
  }
  const doc = documents.get(event.documentId);
  if (!doc) return null;
  if (event.type === "page_view") return pageViewRow(event, doc);
  return { type: event.type, document_id: doc.id, document_version: doc.version, data: { percent: event.percent } };
}

/**
 * The rows to insert, in the batch's order, without the dropped events.
 * @param {readonly ClientEvent[]} events
 * @param {ReadonlyMap<string, DocumentFacts>} documents
 */
export function toEventRows(events, documents) {
  return events.map((event) => toEventRow(event, documents)).filter((row) => row !== null);
}

/** @param {readonly ClientEvent[]} events */
function documentIdsOf(events) {
  return [...new Set(events.flatMap((event) => ("documentId" in event ? [event.documentId] : [])))];
}

/**
 * @param {import("../db.js").TxClient} client
 * @param {readonly string[]} ids
 * @returns {Promise<ReadonlyMap<string, DocumentFacts>>}
 */
async function visibleDocuments(client, ids) {
  if (ids.length === 0) return new Map();
  const { rows } = await client.query(DOCUMENTS_SQL, [JSON.stringify(ids)]);
  return new Map(rows.map((row) => [row.id, row]));
}

/**
 * The session id when the investor owns it, else null; a heartbeat moves its
 * last_heartbeat_at.
 * @param {import("../db.js").TxClient} client
 * @param {string} investorId
 * @param {{sessionId?: string, heartbeat?: true}} batch
 */
async function ownedSession(client, investorId, { sessionId, heartbeat }) {
  if (!sessionId) return null;
  const { rows } = await client.query(heartbeat ? HEARTBEAT_SQL : OWNED_SESSION_SQL, [sessionId, investorId]);
  return rows[0]?.id ?? null;
}

/**
 * @param {import("../db.js").TxClient} client
 * @param {string} investorId
 * @param {z.infer<typeof batchSchema>} batch
 */
async function recordBatch(client, investorId, batch) {
  const sessionId = await ownedSession(client, investorId, batch);
  const documents = await visibleDocuments(client, documentIdsOf(batch.events));
  const rows = toEventRows(batch.events, documents);
  if (rows.length === 0) return;
  await client.query(INSERT_EVENTS_SQL, [investorId, sessionId, JSON.stringify(rows)]);
}

/** @param {{db: import("../db.js").Db}} deps @returns {import("express").RequestHandler} */
function createSession({ db }) {
  return async function postSession(req, res, next) {
    const userAgent = (req.get("user-agent") ?? "").slice(0, USER_AGENT_MAX_LENGTH) || null;
    try {
      const { rows } = await db.query(CREATE_SESSION_SQL, [req.investor.id, userAgent]);
      return res.status(201).json({ sessionId: rows[0].id });
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {{db: import("../db.js").Db}} deps @returns {import("express").RequestHandler} */
function postEvents({ db }) {
  return async function recordEvents(req, res, next) {
    const parsed = batchSchema.safeParse(req.body, PARSE_OPTIONS);
    if (!parsed.success) return sendInvalid(res, parsed.error);
    const batch = parsed.data;
    if (!batch.sessionId && batch.events.length === 0) return res.status(204).end();
    try {
      await db.tx((client) => recordBatch(client, req.investor.id, batch));
      return res.status(204).end();
    } catch (err) {
      return next(err);
    }
  };
}

/** @param {{db: import("../db.js").Db}} deps */
export function createEventsRouter({ db }) {
  const router = express.Router();
  router.post(SESSIONS_PATH, perInvestorLimit({ limit: SESSIONS_LIMIT_PER_MINUTE }), createSession({ db }));
  router.post(EVENTS_PATH, perInvestorLimit({ limit: EVENTS_LIMIT_PER_MINUTE }), postEvents({ db }));
  return router;
}
