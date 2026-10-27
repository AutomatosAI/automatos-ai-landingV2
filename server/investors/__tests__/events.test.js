/**
 * The events API (W1-14) through the portal's own apiRouter, over the test
 * database: sessions without an IP, the three client event types and no
 * other, the caps and clamps, the page and version checks against the
 * document, foreign sessions ignored, heartbeats, identity from the token
 * only, the 64 kB body limit and the rate limit. Documents are written
 * straight into the table.
 */
import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import { EVENT_LIMITS, EVENTS_LIMIT_PER_MINUTE, USER_AGENT_MAX_LENGTH } from "../routes/events.js";
import { documentKey } from "../s3.js";
import { ADA, ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { fakeDocStore } from "./helpers/fake-doc-store.js";
import { createTestDb } from "./helpers/test-db.js";

const ENV = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
  INVESTOR_ADMIN_CLERK_IDS: ADMIN.id,
});

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

/** Invented (KP5): a published 12-page deck, version 2. */
const DECK = Object.freeze({ title: "Example deck", pageCount: 12, version: 2, published: true, withFile: true });

/** @type {import("../db.js").Db} */
let db;
let app;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(() => db.end());

beforeEach(async () => {
  const portal = createInvestorsPortal({
    env: ENV,
    deps: {
      logger: { warn: vi.fn(), error: vi.fn() },
      createDb: () => db,
      docStore: fakeDocStore().store,
      ...fakeAuthDeps(),
    },
  });
  await portal.start();
  app = express().use("/api/investors", portal.apiRouter);
  await db.query("DELETE FROM investors.documents");
  await db.query("DELETE FROM investors.investors");
});

const post = (path, body, who = ADA) =>
  request(app).post(`/api/investors${path}`).set("Authorization", bearer(who.id)).send(body);
const send = (body, who = ADA) => post("/events", body, who);

/** A documents row as the admin flow would leave it; returns its id. */
async function insertDoc(overrides = {}) {
  const doc = { ...DECK, ...overrides };
  const id = randomUUID();
  await db.query(
    `INSERT INTO investors.documents (id, title, kind, s3_key, file_name, content_type, page_count, version, published)
     VALUES ($1, $2, 'pdf', $3, $4, 'application/pdf', $5, $6, $7)`,
    [
      id,
      doc.title,
      doc.withFile ? documentKey(id, doc.version, "Example-Deck.pdf") : null,
      doc.withFile ? "Example-Deck.pdf" : null,
      doc.pageCount,
      doc.version,
      doc.published,
    ],
  );
  return id;
}

/** @param {typeof ADA} who */
async function openSession(who = ADA) {
  const res = await post("/sessions", {}, who);
  expect(res.status).toBe(201);
  return res.body.sessionId;
}

async function clientEvents() {
  const { rows } = await db.query(
    `SELECT i.clerk_user_id, e.session_id, e.type, e.document_id, e.document_version, e.page, e.duration_ms, e.data
       FROM investors.events e JOIN investors.investors i ON i.id = e.investor_id
      WHERE e.type IN ('page_view', 'section_view', 'video_progress', 'document_open', 'document_download')
      ORDER BY e.id`,
  );
  return rows;
}

const pageView = (documentId, page, durationMs = 4000, extra = {}) => ({
  type: "page_view",
  documentId,
  page,
  durationMs,
  ...extra,
});

describe("POST /sessions", () => {
  it("opens a session for the token's investor, with the user agent cut to 300 characters and no IP", async () => {
    const res = await post("/sessions", { investorId: UNKNOWN_ID }).set("User-Agent", "x".repeat(500));
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ sessionId: expect.any(String) });
    const { rows } = await db.query(
      `SELECT s.*, i.clerk_user_id FROM investors.sessions s JOIN investors.investors i ON i.id = s.investor_id`,
    );
    expect(rows).toHaveLength(1);
    const [session] = rows;
    expect(session.id).toBe(res.body.sessionId);
    expect(session.clerk_user_id).toBe(ADA.id);
    expect(session.user_agent).toHaveLength(USER_AGENT_MAX_LENGTH);
    expect(Object.keys(session).sort()).toEqual(
      ["clerk_user_id", "id", "investor_id", "last_heartbeat_at", "started_at", "user_agent"].sort(),
    );
  });

  it("answers 401 without a token", async () => {
    const res = await request(app).post("/api/investors/sessions").send({});
    expect(res.status).toBe(401);
  });
});

describe("POST /events: what is accepted", () => {
  it("records page_view, section_view and video_progress against the session, and answers 204", async () => {
    const deck = await insertDoc();
    const sessionId = await openSession();
    const res = await send({
      sessionId,
      events: [
        pageView(deck, 3, 4200, { documentVersion: 2 }),
        { type: "section_view", section: "overview", durationMs: 9000 },
        { type: "video_progress", documentId: deck, percent: 50 },
      ],
    });
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    const base = { clerk_user_id: ADA.id, session_id: sessionId };
    expect(await clientEvents()).toEqual([
      { ...base, type: "page_view", document_id: deck, document_version: 2, page: 3, duration_ms: 4200, data: null },
      { ...base, type: "section_view", document_id: null, document_version: null, page: null, duration_ms: 9000, data: { section: "overview" } },
      { ...base, type: "video_progress", document_id: deck, document_version: 2, page: null, duration_ms: null, data: { percent: 50 } },
    ]);
  });

  it("records the current version when the client sends none, and matches an upper-case id", async () => {
    const deck = await insertDoc();
    expect((await send({ events: [pageView(deck.toUpperCase(), 1)] })).status).toBe(204);
    expect(await clientEvents()).toMatchObject([{ document_id: deck, document_version: 2, session_id: null }]);
  });

  it.each([
    ["document_open", { type: "document_open", documentId: UNKNOWN_ID }],
    ["document_download", { type: "document_download", documentId: UNKNOWN_ID }],
    ["signed_in", { type: "signed_in" }],
    ["an unknown type", { type: "page_scroll", durationMs: 10 }],
    ["a video percent off the list", { type: "video_progress", documentId: UNKNOWN_ID, percent: 60 }],
    ["a section that is not a slug", { type: "section_view", section: "Team <b>", durationMs: 10 }],
    ["a negative duration", pageView(UNKNOWN_ID, 1, -1)],
    ["a page of 0", pageView(UNKNOWN_ID, 0)],
    ["a page over 2000", pageView(UNKNOWN_ID, EVENT_LIMITS.page + 1)],
  ])("refuses the whole batch for %s: 400 invalid, nothing written", async (_name, event) => {
    const deck = await insertDoc();
    const res = await send({ events: [pageView(deck, 1), event] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields: { events: "invalid" } });
    expect(await clientEvents()).toEqual([]);
  });

  it("takes 50 events and refuses 51 (too_many)", async () => {
    const deck = await insertDoc();
    const events = (n) => Array.from({ length: n }, (_, i) => pageView(deck, (i % 12) + 1));
    expect((await send({ events: events(EVENT_LIMITS.batch) })).status).toBe(204);
    const over = await send({ events: events(EVENT_LIMITS.batch + 1) });
    expect(over.status).toBe(400);
    expect(over.body).toEqual({ error: "invalid", fields: { events: "too_many" } });
    expect(await clientEvents()).toHaveLength(EVENT_LIMITS.batch);
  });

  it("clamps durationMs to 600000 instead of refusing it", async () => {
    const deck = await insertDoc();
    const res = await send({
      events: [pageView(deck, 1, 9_999_999), { type: "section_view", section: "team", durationMs: 600_001 }],
    });
    expect(res.status).toBe(204);
    expect((await clientEvents()).map((row) => row.duration_ms)).toEqual([600_000, 600_000]);
  });

  it("refuses a sessionId that is not a uuid, and a heartbeat that is not true", async () => {
    expect((await send({ sessionId: "abc", events: [] })).body).toEqual({ error: "invalid", fields: { sessionId: "invalid" } });
    expect((await send({ heartbeat: "yes" })).body).toEqual({ error: "invalid", fields: { heartbeat: "invalid" } });
  });
});

describe("POST /events: what is dropped", () => {
  it("drops events for unknown, unpublished and file-less documents and keeps the rest", async () => {
    const deck = await insertDoc();
    const draft = await insertDoc({ published: false });
    const empty = await insertDoc({ withFile: false });
    const res = await send({
      events: [
        pageView(UNKNOWN_ID, 1),
        pageView(draft, 1),
        { type: "video_progress", documentId: empty, percent: 25 },
        pageView(deck, 2),
      ],
    });
    expect(res.status).toBe(204);
    expect(await clientEvents()).toMatchObject([{ document_id: deck, page: 2 }]);
  });

  it("checks the page against the current version's page_count", async () => {
    const deck = await insertDoc();
    await send({ events: [pageView(deck, 12), pageView(deck, 13), pageView(deck, 13, 10, { documentVersion: 2 })] });
    expect((await clientEvents()).map((row) => row.page)).toEqual([12]);
  });

  it("allows 1..2000 for an older version, or a document without a page count; drops a future version", async () => {
    const deck = await insertDoc();
    const unmeasured = await insertDoc({ pageCount: null, version: 1 });
    await send({
      events: [
        pageView(deck, 40, 10, { documentVersion: 1 }),
        pageView(deck, 1, 10, { documentVersion: 3 }),
        pageView(unmeasured, EVENT_LIMITS.page),
      ],
    });
    expect(await clientEvents()).toMatchObject([
      { document_id: deck, document_version: 1, page: 40 },
      { document_id: unmeasured, document_version: 1, page: EVENT_LIMITS.page },
    ]);
  });
});

describe("POST /events: sessions and heartbeats", () => {
  /** @param {string} sessionId */
  const ageSession = (sessionId) =>
    db.query("UPDATE investors.sessions SET last_heartbeat_at = now() - interval '1 hour' WHERE id = $1", [sessionId]);
  /** @param {string} sessionId */
  async function beatenRecently(sessionId) {
    const { rows } = await db.query(
      "SELECT last_heartbeat_at > now() - interval '1 minute' AS recent FROM investors.sessions WHERE id = $1",
      [sessionId],
    );
    return rows[0].recent;
  }

  it("a heartbeat moves the session's last_heartbeat_at; a batch without one does not", async () => {
    const sessionId = await openSession();
    await ageSession(sessionId);
    expect((await send({ sessionId, events: [] })).status).toBe(204);
    expect(await beatenRecently(sessionId)).toBe(false);
    expect((await send({ sessionId, heartbeat: true })).status).toBe(204);
    expect(await beatenRecently(sessionId)).toBe(true);
  });

  it("ignores another investor's session: no heartbeat on it, and the events are kept without it", async () => {
    const deck = await insertDoc();
    const adaSession = await openSession(ADA);
    await ageSession(adaSession);
    const res = await send({ sessionId: adaSession, heartbeat: true, events: [pageView(deck, 1)] }, ADMIN);
    expect(res.status).toBe(204);
    expect(await beatenRecently(adaSession)).toBe(false);
    expect(await clientEvents()).toMatchObject([{ clerk_user_id: ADMIN.id, session_id: null }]);
  });

  it("ignores an unknown session id", async () => {
    const deck = await insertDoc();
    expect((await send({ sessionId: UNKNOWN_ID, heartbeat: true, events: [pageView(deck, 1)] })).status).toBe(204);
    expect(await clientEvents()).toMatchObject([{ clerk_user_id: ADA.id, session_id: null }]);
  });
});

describe("POST /events: identity, size and rate", () => {
  it("records against the token's investor, whatever investor id the body carries", async () => {
    const deck = await insertDoc();
    await openSession(ADMIN);
    const { rows } = await db.query("SELECT id FROM investors.investors WHERE clerk_user_id = $1", [ADMIN.id]);
    const adminId = rows[0].id;
    const res = await send({
      investorId: adminId,
      investor_id: adminId,
      clerkUserId: ADMIN.id,
      events: [pageView(deck, 1, 10, { investorId: adminId, investor_id: adminId })],
    });
    expect(res.status).toBe(204);
    expect(await clientEvents()).toMatchObject([{ clerk_user_id: ADA.id }]);
  });

  it("answers 401 without a token and writes nothing", async () => {
    const deck = await insertDoc();
    const res = await request(app).post("/api/investors/events").send({ events: [pageView(deck, 1)] });
    expect(res.status).toBe(401);
    expect(await clientEvents()).toEqual([]);
  });

  it("answers 413 for a body over 64 kB", async () => {
    const res = await send({ events: [], padding: "x".repeat(64 * 1024) });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "bad_request" });
  });

  it("answers 429 rate_limited on the 121st request in a minute, per investor (KP16)", async () => {
    expect(EVENTS_LIMIT_PER_MINUTE).toBe(120);
    for (let i = 0; i < EVENTS_LIMIT_PER_MINUTE; i += 1) {
      expect((await send({ events: [] })).status).toBe(204);
    }
    const over = await send({ events: [] });
    expect(over.status).toBe(429);
    expect(over.body).toEqual({ error: "rate_limited" });
    expect((await send({ events: [] }, ADMIN)).status).toBe(204);
  });
});
