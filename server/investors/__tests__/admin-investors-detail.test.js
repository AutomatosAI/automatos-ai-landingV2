/**
 * One investor for the admin (W1-15) through the portal's own apiRouter,
 * over the test database with fixture rows: the profile and per-document
 * summary, the paged timeline, block and unblock (then the investor's own
 * call is 403), delete with its cascade (the Clerk account untouched), the
 * JSON export, bad ids and the admin gate. The list is in
 * admin-investors.test.js.
 */
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import { PAGE_SIZE } from "../queries/investor-list.js";
import { ADA, ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { insertDocument, insertEvents, insertInvestor, insertSessions, pageView, repeat } from "./helpers/investor-fixtures.js";
import { createTestDb } from "./helpers/test-db.js";

const ENV = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
  INVESTOR_ADMIN_CLERK_IDS: ADMIN.id,
});

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

/** @type {import("../db.js").Db} */
let db;
let app;
let logger;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(() => db.end());

beforeEach(async () => {
  logger = { warn: vi.fn(), error: vi.fn() };
  const portal = createInvestorsPortal({ env: ENV, deps: { logger, createDb: () => db, ...fakeAuthDeps() } });
  await portal.start();
  app = express().use("/api/investors", portal.apiRouter);
  await db.query("DELETE FROM investors.documents");
  await db.query("DELETE FROM investors.investors");
});

const api = (method, path, who = ADMIN) =>
  request(app)[method](`/api/investors${path}`).set("Authorization", bearer(who.id));

/** Ada signs in through the guard (as the app would), and her row's id comes back. */
async function signInAda() {
  expect((await api("get", "/me", ADA)).status).toBe(200);
  const { rows } = await db.query("SELECT id FROM investors.investors WHERE clerk_user_id = $1", [ADA.id]);
  return rows[0].id;
}

/** @param {string} table @param {string} investorId */
async function countRows(table, investorId) {
  const { rows } = await db.query(`SELECT count(*) AS n FROM investors.${table} WHERE investor_id = $1`, [investorId]);
  return rows[0].n;
}

describe("GET /admin/investors/:id", () => {
  it("answers the profile with the marketing opt-in and its time, and a summary per document", async () => {
    const deck = await insertDocument(db, { title: "Example deck", pageCount: 12, version: 2, sortOrder: 1 });
    const notes = await insertDocument(db, { title: "Example notes", pageCount: null, sortOrder: 0 });
    const gone = await insertDocument(db, { title: "Example removed" });
    const ada = await insertInvestor(db, { email: "ada@example.com", chequeSize: "gt_1m", marketingOptIn: true });
    await insertEvents(db, ada, [
      ...repeat("document_open", deck, 2),
      pageView(deck, 1, 1000, 2),
      pageView(deck, 4, 2000, 2),
      pageView(deck, 14, 500, 1),
      { type: "document_download", documentId: deck },
      { type: "document_download", documentId: notes },
      { type: "section_view", durationMs: 9000, data: { section: "team" } },
      { type: "document_open", documentId: gone },
    ]);
    await db.query("DELETE FROM investors.documents WHERE id = $1", [gone]);
    const res = await api("get", `/admin/investors/${ada}`);
    expect(res.status).toBe(200);
    expect(res.body.investor).toMatchObject({
      id: ada,
      email: "ada@example.com",
      name: "Ada Example",
      firm: "Example Ventures",
      investorType: "vc",
      chequeSize: "gt_1m",
      source: "websummit",
      marketingOptIn: true,
      marketingOptInAt: expect.any(String),
      profileCompletedAt: expect.any(String),
      blocked: false,
      createdAt: expect.any(String),
      lastSeenAt: expect.any(String),
    });
    expect(res.body.documents).toEqual([
      { documentId: notes, title: "Example notes", kind: "pdf", pageCount: null, opens: 0, furthestPage: 0, timeMs: 0, downloaded: true },
      { documentId: deck, title: "Example deck", kind: "pdf", pageCount: 12, opens: 2, furthestPage: 12, timeMs: 3500, downloaded: true },
    ]);
  });

  it("answers an investor with no activity with no documents", async () => {
    const quiet = await insertInvestor(db, { marketingOptIn: false });
    const res = await api("get", `/admin/investors/${quiet}`);
    expect(res.body).toMatchObject({ investor: { marketingOptIn: false, marketingOptInAt: null }, documents: [] });
  });

  it("answers 404 not_found for an unknown id and for an id that is not a uuid", async () => {
    for (const id of [UNKNOWN_ID, "not-a-uuid", "1 OR 1=1"]) {
      const res = await api("get", `/admin/investors/${encodeURIComponent(id)}`);
      expect({ id, status: res.status, body: res.body }).toEqual({ id, status: 404, body: { error: "not_found" } });
    }
  });
});

describe("GET /admin/investors/:id/events", () => {
  it("pages the timeline 50 at a time, newest first, with document titles", async () => {
    const deck = await insertDocument(db, { title: "Example deck" });
    const ada = await insertInvestor(db);
    const events = Array.from({ length: 55 }, (_, i) => ({ ...pageView(deck, (i % 12) + 1), minutesAgo: 55 - i }));
    await insertEvents(db, ada, [...events, { type: "section_view", durationMs: 10, data: { section: "team" } }]);
    const first = await api("get", `/admin/investors/${ada}/events`);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ total: 56, page: 1, pageSize: PAGE_SIZE });
    expect(first.body.events).toHaveLength(PAGE_SIZE);
    expect(first.body.events[0]).toEqual({
      id: expect.any(Number),
      type: "section_view",
      sessionId: null,
      documentId: null,
      documentTitle: null,
      documentVersion: null,
      page: null,
      durationMs: 10,
      data: { section: "team" },
      createdAt: expect.any(String),
    });
    expect(first.body.events[1]).toMatchObject({ type: "page_view", documentId: deck, documentTitle: "Example deck", page: 7 });
    const times = first.body.events.map((event) => Date.parse(event.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    const second = await api("get", `/admin/investors/${ada}/events`).query({ page: "2" });
    expect(second.body.events.map((event) => event.page)).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it("keeps events of a deleted document, without a title", async () => {
    const doc = await insertDocument(db, { title: "Example removed" });
    const ada = await insertInvestor(db);
    await insertEvents(db, ada, [{ type: "document_open", documentId: doc }]);
    await db.query("DELETE FROM investors.documents WHERE id = $1", [doc]);
    const res = await api("get", `/admin/investors/${ada}/events`);
    expect(res.body.events).toMatchObject([{ type: "document_open", documentId: null, documentTitle: null }]);
  });

  it("answers 404 for an unknown investor and 400 for a bad page", async () => {
    expect((await api("get", `/admin/investors/${UNKNOWN_ID}/events`)).status).toBe(404);
    const ada = await insertInvestor(db);
    const res = await api("get", `/admin/investors/${ada}/events`).query({ page: "-1" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields: { page: "invalid" } });
  });
});

describe("PATCH /admin/investors/:id {blocked}", () => {
  it("blocks: the investor's own next call is 403 blocked; unblocking lets them back", async () => {
    const ada = await signInAda();
    const blocked = await api("patch", `/admin/investors/${ada}`).send({ blocked: true });
    expect(blocked.status).toBe(200);
    expect(blocked.body.investor).toMatchObject({ id: ada, blocked: true });
    const refused = await api("get", "/me", ADA);
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual({ error: "blocked" });
    expect((await api("post", "/events", ADA).send({ events: [] })).status).toBe(403);
    expect((await api("patch", `/admin/investors/${ada}`).send({ blocked: false })).body.investor.blocked).toBe(false);
    expect((await api("get", "/me", ADA)).status).toBe(200);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`blocked investor ${ada}`));
  });

  it("refuses a body without a boolean blocked, and ignores other keys", async () => {
    const ada = await insertInvestor(db, { email: "ada@example.com" });
    expect((await api("patch", `/admin/investors/${ada}`).send({})).body).toEqual({ error: "invalid", fields: { blocked: "required" } });
    expect((await api("patch", `/admin/investors/${ada}`).send({ blocked: "yes" })).body).toEqual({
      error: "invalid",
      fields: { blocked: "invalid" },
    });
    const res = await api("patch", `/admin/investors/${ada}`).send({ blocked: true, email: "eve@example.com", name: "Eve" });
    expect(res.body.investor).toMatchObject({ blocked: true, email: "ada@example.com", name: "Ada Example" });
  });

  it("will not let an admin block themselves (409), and answers 404 for an unknown id", async () => {
    await api("get", "/me");
    const { rows } = await db.query("SELECT id FROM investors.investors WHERE clerk_user_id = $1", [ADMIN.id]);
    const self = await api("patch", `/admin/investors/${rows[0].id.toUpperCase()}`).send({ blocked: true });
    expect(self.status).toBe(409);
    expect(self.body).toEqual({ error: "cannot_block_self" });
    expect((await api("patch", `/admin/investors/${UNKNOWN_ID}`).send({ blocked: true })).status).toBe(404);
  });
});

describe("DELETE /admin/investors/:id", () => {
  it("deletes the investor with their sessions, events and alert records: 204, and a second delete is 404", async () => {
    const deck = await insertDocument(db);
    const ada = await signInAda();
    const other = await insertInvestor(db);
    for (const id of [ada, other]) {
      const [session] = await insertSessions(db, id, 2);
      await insertEvents(db, id, [{ type: "document_open", documentId: deck, sessionId: session }, pageView(deck, 2)]);
      await db.query("INSERT INTO investors.alerts_sent (investor_id, kind) VALUES ($1, 'signup')", [id]);
    }
    const res = await api("delete", `/admin/investors/${ada}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    for (const table of ["sessions", "events", "alerts_sent"]) {
      expect({ table, ada: await countRows(table, ada) }).toEqual({ table, ada: 0 });
      expect(await countRows(table, other)).toBeGreaterThan(0);
    }
    expect((await db.query("SELECT id FROM investors.investors WHERE id = $1", [ada])).rows).toEqual([]);
    expect((await db.query("SELECT id FROM investors.documents")).rows).toEqual([{ id: deck }]);
    expect((await api("delete", `/admin/investors/${ada}`)).status).toBe(404);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`deleted investor ${ada}`));
  });

  it("leaves the Clerk account alone: Ada's next sign-in starts a new, empty row", async () => {
    const ada = await signInAda();
    await insertEvents(db, ada, [{ type: "section_view", durationMs: 10, data: { section: "team" } }]);
    expect((await api("delete", `/admin/investors/${ada}`)).status).toBe(204);
    const again = await signInAda();
    expect(again).not.toBe(ada);
    const { rows } = await db.query("SELECT type FROM investors.events WHERE investor_id = $1", [again]);
    expect(rows).toEqual([{ type: "signed_in" }]);
  });
});

describe("GET /admin/investors/:id/export", () => {
  it("answers a JSON attachment with the profile, the sessions and every event, oldest first", async () => {
    const deck = await insertDocument(db, { title: "Example deck" });
    const ada = await signInAda();
    const [session] = await insertSessions(db, ada, 1);
    await insertEvents(db, ada, [
      { type: "document_open", documentId: deck, sessionId: session, minutesAgo: 3 },
      { ...pageView(deck, 2, 4000), sessionId: session, minutesAgo: 2 },
      { type: "document_download", documentId: deck, minutesAgo: 1 },
    ]);
    const res = await api("get", `/admin/investors/${ada}/export`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^application\/json/);
    expect(res.headers["content-disposition"]).toBe(`attachment; filename="investor-${ada}.json"`);
    expect(Object.keys(res.body).sort()).toEqual(["events", "exportedAt", "investor", "sessions"]);
    expect(res.body.investor).toMatchObject({ id: ada, clerkUserId: ADA.id, email: ADA.email, name: ADA.name });
    expect(res.body.sessions).toEqual([
      { id: session, startedAt: expect.any(String), lastHeartbeatAt: expect.any(String), userAgent: "Example/1.0" },
    ]);
    expect(res.body.events.map((event) => event.type)).toEqual(["document_open", "page_view", "document_download", "signed_in"]);
    expect(res.body.events[1]).toMatchObject({ sessionId: session, documentTitle: "Example deck", page: 2, durationMs: 4000 });
  });

  it("answers 404 for an unknown investor", async () => {
    const res = await api("get", `/admin/investors/${UNKNOWN_ID}/export`);
    expect(res.status).toBe(404);
    expect(res.headers["content-disposition"]).toBeUndefined();
  });
});

describe("the admin gate on one investor's routes", () => {
  it("answers 403 forbidden to an investor who is not an admin, and changes nothing", async () => {
    const other = await insertInvestor(db);
    const probes = [
      ["get", `/admin/investors/${other}`],
      ["get", `/admin/investors/${other}/events`],
      ["get", `/admin/investors/${other}/export`],
      ["patch", `/admin/investors/${other}`],
      ["delete", `/admin/investors/${other}`],
    ];
    for (const [method, path] of probes) {
      const call = api(method, path, ADA);
      const res = await (method === "patch" ? call.send({ blocked: true }) : call);
      expect({ method, path, status: res.status, body: res.body }).toEqual({ method, path, status: 403, body: { error: "forbidden" } });
    }
    const { rows } = await db.query("SELECT blocked FROM investors.investors WHERE id = $1", [other]);
    expect(rows).toEqual([{ blocked: false }]);
  });
});
