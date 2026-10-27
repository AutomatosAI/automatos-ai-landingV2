/**
 * One document's analytics (W2-05) through the portal's own apiRouter, over
 * the test database with fixture events across two versions of a deck: the
 * default (current) version and the ?version filter, the zero-filled pages
 * with their dwell and reach, the reader list and its order, the versions
 * that have events, a document without a page count, bad ids and versions,
 * the admin gate and the 503 without storage.
 */
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import { MAX_VERSION } from "../queries/document-stats.js";
import { ADA, ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { fakeDocStore } from "./helpers/fake-doc-store.js";
import { insertDocument, insertEvents, insertInvestor, pageView } from "./helpers/investor-fixtures.js";
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
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(() => db.end());

/** @param {Record<string, unknown>} deps */
async function mountPortal(deps) {
  const logger = { warn: vi.fn(), error: vi.fn() };
  const portal = createInvestorsPortal({ env: ENV, deps: { logger, createDb: () => db, ...fakeAuthDeps(), ...deps } });
  await portal.start();
  return express().use("/api/investors", portal.apiRouter);
}

beforeEach(async () => {
  app = await mountPortal({ docStore: fakeDocStore().store });
  await db.query("DELETE FROM investors.documents");
  await db.query("DELETE FROM investors.investors");
});

const stats = (id, query = {}, who = ADMIN) =>
  request(app).get(`/api/investors/admin/documents/${id}/stats`).query(query).set("Authorization", bearer(who.id));

/** @param {string} documentId @param {number} version @param {number} minutesAgo */
const open = (documentId, version, minutesAgo) => ({ type: "document_open", documentId, version, minutesAgo });
/** @param {string} documentId @param {number} version @param {number} minutesAgo */
const download = (documentId, version, minutesAgo) => ({ type: "document_download", documentId, version, minutesAgo });

/**
 * A five-page deck at version 2. On v2: Ada opens twice, reads pages 1-3
 * (page 1 twice) and downloads; Ben reads pages 1-2; Cy opens last and has
 * no page recorded; Dee only downloads. On v1: Ben read all five pages.
 * Another document's events must not count.
 */
async function deckFixture() {
  const deck = await insertDocument(db, { title: "Example deck", pageCount: 5, version: 2 });
  const other = await insertDocument(db, { title: "Example notes", pageCount: 5 });
  const ada = await insertInvestor(db, { name: "Ada Example", firm: "Example Ventures" });
  const ben = await insertInvestor(db, { name: "Ben Sample", firm: "Sample Capital" });
  const cy = await insertInvestor(db, { name: "Cy Placeholder", firm: null });
  const dee = await insertInvestor(db, { name: "Dee Invented", firm: "Invented Partners" });
  await insertEvents(db, ada, [
    open(deck, 2, 30),
    pageView(deck, 1, 1000, 2),
    pageView(deck, 2, 3000, 2),
    pageView(deck, 3, 2000, 2),
    pageView(deck, 1, 500, 2),
    download(deck, 2, 4),
    open(deck, 2, 5),
    open(other, 1, 1),
    pageView(other, 5, 9000, 1),
  ]);
  await insertEvents(db, ben, [
    open(deck, 1, 600),
    ...[1, 2, 3, 4, 5].map((page) => pageView(deck, page, 2000, 1)),
    open(deck, 2, 10),
    pageView(deck, 1, 4000, 2),
    pageView(deck, 2, 1000, 2),
  ]);
  await insertEvents(db, cy, [open(deck, 2, 1)]);
  await insertEvents(db, dee, [download(deck, 2, 2)]);
  return { deck, ada, ben, cy, dee };
}

describe("GET /admin/documents/:id/stats", () => {
  it("answers the current version by default: counts, zero-filled pages and every reader", async () => {
    const { deck, ada, ben, cy, dee } = await deckFixture();
    const res = await stats(deck);
    expect(res.status).toBe(200);
    expect(res.body.document).toMatchObject({ id: deck, title: "Example deck", kind: "pdf", pageCount: 5, version: 2 });
    expect(res.body.document).not.toHaveProperty("s3Key");
    expect(res.body).toMatchObject({ version: 2, versions: [2, 1], uniqueReaders: 4, opens: 4, downloads: 2 });
    // (6500 + 5000 + 0 + 0) / 4 readers.
    expect(res.body.avgTimeMs).toBe(2875);
    expect(res.body.pages).toEqual([
      { page: 1, avgDwellMs: 2750, readersReached: 2, pctReached: 50 },
      { page: 2, avgDwellMs: 2000, readersReached: 2, pctReached: 50 },
      { page: 3, avgDwellMs: 2000, readersReached: 1, pctReached: 25 },
      { page: 4, avgDwellMs: 0, readersReached: 0, pctReached: 0 },
      { page: 5, avgDwellMs: 0, readersReached: 0, pctReached: 0 },
    ]);
    expect(res.body.readers).toEqual([
      { investorId: cy, name: "Cy Placeholder", firm: null, furthestPage: 0, timeMs: 0, downloaded: false, lastOpenAt: expect.any(String) },
      { investorId: ada, name: "Ada Example", firm: "Example Ventures", furthestPage: 3, timeMs: 6500, downloaded: true, lastOpenAt: expect.any(String) },
      { investorId: ben, name: "Ben Sample", firm: "Sample Capital", furthestPage: 2, timeMs: 5000, downloaded: false, lastOpenAt: expect.any(String) },
      { investorId: dee, name: "Dee Invented", firm: "Invented Partners", furthestPage: 0, timeMs: 0, downloaded: true, lastOpenAt: null },
    ]);
  });

  it("orders readers by their latest open, newest first, and the latest open is the later of two", async () => {
    const { deck, ada } = await deckFixture();
    const { readers } = (await stats(deck)).body;
    const opened = readers.filter((reader) => reader.lastOpenAt !== null).map((reader) => Date.parse(reader.lastOpenAt));
    expect(opened).toEqual([...opened].sort((a, b) => b - a));
    const adaOpen = Date.parse(readers.find((reader) => reader.investorId === ada).lastOpenAt);
    expect(Date.now() - adaOpen).toBeLessThan(6 * 60_000);
  });

  it("filters by ?version: only that version's events count", async () => {
    const { deck, ben } = await deckFixture();
    const res = await stats(deck, { version: "1" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ version: 1, versions: [2, 1], uniqueReaders: 1, opens: 1, downloads: 0, avgTimeMs: 10000 });
    expect(res.body.pages).toEqual(
      [1, 2, 3, 4, 5].map((page) => ({ page, avgDwellMs: 2000, readersReached: 1, pctReached: 100 })),
    );
    expect(res.body.readers).toEqual([
      { investorId: ben, name: "Ben Sample", firm: "Sample Capital", furthestPage: 5, timeMs: 10000, downloaded: false, lastOpenAt: expect.any(String) },
    ]);
  });

  it("answers zeros for a version with no events", async () => {
    const { deck } = await deckFixture();
    const res = await stats(deck, { version: "7" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ version: 7, versions: [2, 1], uniqueReaders: 0, opens: 0, downloads: 0, avgTimeMs: 0, readers: [] });
    expect(res.body.pages).toEqual(
      [1, 2, 3, 4, 5].map((page) => ({ page, avgDwellMs: 0, readersReached: 0, pctReached: 0 })),
    );
  });

  it("keeps pctReached non-increasing down the document, rounded to one decimal", async () => {
    const deck = await insertDocument(db, { pageCount: 6 });
    const reads = [[1, 2, 3, 4, 5, 6], [1, 3], [2], [], [1, 2, 3, 6]];
    for (const pages of reads) {
      const investor = await insertInvestor(db);
      await insertEvents(db, investor, [open(deck, 1, 3), ...pages.map((page) => pageView(deck, page, 1500))]);
    }
    const { pages } = (await stats(deck)).body;
    // Furthest pages 6, 3, 2, 0, 6 of 5 readers.
    expect(pages.map((page) => page.readersReached)).toEqual([4, 4, 3, 2, 2, 2]);
    expect(pages.map((page) => page.pctReached)).toEqual([80, 80, 60, 40, 40, 40]);
    const shares = pages.map((page) => page.pctReached);
    shares.slice(1).forEach((share, i) => expect(share).toBeLessThanOrEqual(shares[i]));

    const thirds = await insertDocument(db, { pageCount: 3 });
    for (const furthest of [3, 1, 1]) {
      const investor = await insertInvestor(db);
      await insertEvents(db, investor, [pageView(thirds, furthest, 1000)]);
    }
    const rounded = (await stats(thirds)).body.pages.map((page) => page.pctReached);
    expect(rounded).toEqual([100, 33.3, 33.3]);
  });

  it("answers no pages for a document without a page count, with its readers", async () => {
    const video = await insertDocument(db, { title: "Example video", pageCount: null });
    const ada = await insertInvestor(db);
    await insertEvents(db, ada, [
      open(video, 1, 3),
      { type: "video_progress", documentId: video, version: 1, data: { percent: 50 } },
    ]);
    const res = await stats(video);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ version: 1, versions: [1], uniqueReaders: 1, opens: 1, avgTimeMs: 0, pages: [] });
    expect(res.body.readers).toMatchObject([{ investorId: ada, furthestPage: 0, timeMs: 0 }]);
  });

  it("answers an unread document with no versions and no readers", async () => {
    const deck = await insertDocument(db, { pageCount: 2 });
    const res = await stats(deck);
    expect(res.body).toMatchObject({ version: 1, versions: [], uniqueReaders: 0, opens: 0, downloads: 0, avgTimeMs: 0, readers: [] });
    expect(res.body.pages).toEqual([
      { page: 1, avgDwellMs: 0, readersReached: 0, pctReached: 0 },
      { page: 2, avgDwellMs: 0, readersReached: 0, pctReached: 0 },
    ]);
  });
});

describe("GET /admin/documents/:id/stats: refusals", () => {
  it("answers 400 invalid for a version that is not a whole number from 1", async () => {
    const deck = await insertDocument(db);
    for (const version of ["0", "-1", "1.5", "abc", "", " 2", "01", String(MAX_VERSION + 1), "99999999999"]) {
      const res = await stats(deck, { version });
      expect({ version, status: res.status, body: res.body }).toEqual({
        version,
        status: 400,
        body: { error: "invalid", fields: { version: "invalid" } },
      });
    }
    expect((await stats(deck, { version: String(MAX_VERSION) })).status).toBe(200);
  });

  it("answers 400 invalid for a repeated version", async () => {
    const deck = await insertDocument(db);
    const res = await request(app)
      .get(`/api/investors/admin/documents/${deck}/stats?version=1&version=2`)
      .set("Authorization", bearer(ADMIN.id));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields: { version: "invalid" } });
  });

  it("answers 404 not_found for an unknown or malformed id, and for a deleted document", async () => {
    const gone = await insertDocument(db);
    await db.query("DELETE FROM investors.documents WHERE id = $1", [gone]);
    for (const id of [UNKNOWN_ID, gone, "not-a-uuid", "1 OR 1=1"]) {
      const res = await stats(encodeURIComponent(id));
      expect({ id, status: res.status, body: res.body }).toEqual({ id, status: 404, body: { error: "not_found" } });
    }
  });

  it("answers 403 forbidden to a signed-in investor who is not an admin", async () => {
    const { deck } = await deckFixture();
    const res = await stats(deck, {}, ADA);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "forbidden" });
  });

  it("answers 401 without a token", async () => {
    const deck = await insertDocument(db);
    const res = await request(app).get(`/api/investors/admin/documents/${deck}/stats`);
    expect(res.status).toBe(401);
  });

  it("answers 503 storage_unavailable without the S3 config, like every document route", async () => {
    app = await mountPortal({});
    const deck = await insertDocument(db);
    const res = await stats(deck);
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "storage_unavailable" });
  });
});
