/**
 * The admin investors list (W1-15) through the portal's own apiRouter, over
 * the test database with fixture rows: the row shape and its aggregates,
 * sorting by every key both ways, search (with % and _ taken literally),
 * the type and source filters, paging, deck progress, query validation and
 * the admin gate. One investor's detail, timeline, block, delete and export
 * are in admin-investors-detail.test.js.
 */
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import { PAGE_SIZE, SORT_KEYS, searchPattern } from "../queries/investor-list.js";
import { LIST_LIMITS } from "../routes/admin-investors.js";
import { ADA, ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { insertDocument, insertEvents, insertInvestor, insertSessions, pageView, repeat } from "./helpers/investor-fixtures.js";
import { createTestDb } from "./helpers/test-db.js";

const ENV = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
  INVESTOR_ADMIN_CLERK_IDS: ADMIN.id,
});

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
    deps: { logger: { warn: vi.fn(), error: vi.fn() }, createDb: () => db, ...fakeAuthDeps() },
  });
  await portal.start();
  app = express().use("/api/investors", portal.apiRouter);
  await db.query("DELETE FROM investors.documents");
  await db.query("DELETE FROM investors.investors");
});

/** @param {Record<string, string>} [query] */
const list = (query = {}, who = ADMIN) =>
  request(app).get("/api/investors/admin/investors").query(query).set("Authorization", bearer(who.id));

/** The ids of a list answer, without the admin's own row (the admin's requests create it). */
const fixtureIds = (res, ids) => res.body.investors.map((row) => row.id).filter((id) => ids.includes(id));

/**
 * Four investors whose every sort key orders them differently; the values
 * per key are listed in the order A, B, C, D.
 */
const SORT_FIXTURE = Object.freeze({
  name: ["Ada Example", "ben Sample", "Cy Placeholder", "Dee Fixture"],
  firm: ["Zeta Example Fund", "alpha Sample Capital", "Mid Placeholder Partners", "Beta Fixture Group"],
  createdDaysAgo: [3, 1, 2, 5],
  lastSeenDaysAgo: [0, 5, 2, 1],
  sessions: [2, 0, 1, 3],
  totalMs: [1000, 3000, 0, 2000],
  docsOpened: [1, 2, 0, 3],
  downloads: [2, 0, 3, 1],
});

/** Ascending order of A..D for each sort key (indexes into the fixture). */
const ASCENDING = Object.freeze({
  name: [0, 1, 2, 3],
  firm: [1, 3, 2, 0],
  created_at: [3, 0, 2, 1],
  last_seen_at: [1, 2, 3, 0],
  sessions: [1, 2, 0, 3],
  total_ms: [2, 0, 3, 1],
  docs_opened: [2, 0, 1, 3],
  downloads: [1, 3, 0, 2],
});

async function seedSortFixture() {
  const docs = [];
  for (const title of ["Doc one", "Doc two", "Doc three"]) docs.push(await insertDocument(db, { title }));
  const ids = [];
  for (let i = 0; i < 4; i += 1) {
    const id = await insertInvestor(db, {
      name: SORT_FIXTURE.name[i],
      firm: SORT_FIXTURE.firm[i],
      createdDaysAgo: SORT_FIXTURE.createdDaysAgo[i],
      lastSeenDaysAgo: SORT_FIXTURE.lastSeenDaysAgo[i],
    });
    await insertSessions(db, id, SORT_FIXTURE.sessions[i]);
    const opens = docs.slice(0, SORT_FIXTURE.docsOpened[i]).map((documentId) => ({ type: "document_open", documentId }));
    const time = SORT_FIXTURE.totalMs[i] ? [{ type: "section_view", durationMs: SORT_FIXTURE.totalMs[i], data: { section: "team" } }] : [];
    await insertEvents(db, id, [...opens, ...time, ...repeat("document_download", docs[0], SORT_FIXTURE.downloads[i])]);
    ids.push(id);
  }
  return ids;
}

describe("GET /admin/investors: rows and aggregates", () => {
  it("answers each investor with the profile fields and the aggregates, paged 50", async () => {
    const deck = await insertDocument(db, { alertOnFirstOpen: true, pageCount: 12 });
    const ada = await insertInvestor(db, { email: "ada@example.com", chequeSize: "50k_250k", createdDaysAgo: 2 });
    const [session] = await insertSessions(db, ada, 2);
    await insertEvents(db, ada, [
      { type: "signed_in" },
      ...repeat("document_open", deck, 2),
      pageView(deck, 3, 4000),
      pageView(deck, 1, 500),
      { type: "section_view", durationMs: 1500, data: { section: "team" }, sessionId: session },
      { type: "video_progress", documentId: deck, data: { percent: 50 } },
      ...repeat("document_download", deck, 2),
    ]);
    const res = await list({ q: "ada@example.com" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      investors: [
        {
          id: ada,
          name: "Ada Example",
          email: "ada@example.com",
          firm: "Example Ventures",
          investorType: "vc",
          chequeSize: "50k_250k",
          source: "websummit",
          createdAt: expect.any(String),
          lastSeenAt: expect.any(String),
          sessions: 2,
          totalMs: 6000,
          docsOpened: 1,
          downloads: 2,
          deckProgress: { documentId: deck, maxPage: 3, pageCount: 12 },
          blocked: false,
        },
      ],
      total: 1,
      page: 1,
      pageSize: PAGE_SIZE,
    });
  });

  it("counts zero for an investor with no activity", async () => {
    const quiet = await insertInvestor(db, { email: "quiet@example.com" });
    const res = await list({ q: "quiet@" });
    expect(res.body.investors).toEqual([
      expect.objectContaining({ id: quiet, sessions: 0, totalMs: 0, docsOpened: 0, downloads: 0, deckProgress: null }),
    ]);
  });
});

describe("GET /admin/investors: sorting", () => {
  it.each(SORT_KEYS)("sorts by %s, both directions", async (sort) => {
    const ids = await seedSortFixture();
    const ascending = ASCENDING[sort].map((index) => ids[index]);
    const asc = await list({ sort, dir: "asc" });
    expect(asc.status).toBe(200);
    expect(fixtureIds(asc, ids)).toEqual(ascending);
    const desc = await list({ sort, dir: "desc" });
    expect(fixtureIds(desc, ids)).toEqual([...ascending].reverse());
  });

  it("sorts by last seen, newest first, when no sort is given", async () => {
    const ids = await seedSortFixture();
    const res = await list();
    expect(fixtureIds(res, ids)).toEqual([...ASCENDING.last_seen_at].reverse().map((index) => ids[index]));
  });

  it("puts a missing name or firm last in either direction", async () => {
    const named = await insertInvestor(db, { name: "Ada Example", firm: "Example Ventures" });
    const unnamed = await insertInvestor(db, { name: null, firm: null });
    for (const sort of ["name", "firm"]) {
      for (const dir of ["asc", "desc"]) {
        expect(fixtureIds(await list({ sort, dir }), [named, unnamed])).toEqual([named, unnamed]);
      }
    }
  });
});

describe("GET /admin/investors: search and filters", () => {
  it("matches name, email and firm anywhere, ignoring letter case", async () => {
    const byName = await insertInvestor(db, { name: "Grace Sample", firm: "One Fund", email: "one@example.com" });
    const byFirm = await insertInvestor(db, { name: "Ben Example", firm: "Grace Partners", email: "two@example.com" });
    const byEmail = await insertInvestor(db, { name: "Cy Example", firm: "Three Fund", email: "GRACE@example.org" });
    await insertInvestor(db, { name: "Dee Example", firm: "Four Fund", email: "four@example.com" });
    const res = await list({ q: "  grace ", sort: "name", dir: "asc" });
    expect(res.body.investors.map((row) => row.id)).toEqual([byFirm, byEmail, byName]);
    expect(res.body.total).toBe(3);
  });

  it("takes % and _ in the search literally", async () => {
    const percent = await insertInvestor(db, { firm: "100% Example Capital" });
    const underscore = await insertInvestor(db, { firm: "Under_score Example" });
    const backslash = await insertInvestor(db, { firm: "Back\\slash Example" });
    await insertInvestor(db, { firm: "Plain Example Fund" });
    const ids = (res) => res.body.investors.map((row) => row.id);
    expect(ids(await list({ q: "%" }))).toEqual([percent]);
    expect(ids(await list({ q: "0% e" }))).toEqual([percent]);
    expect(ids(await list({ q: "_" }))).toEqual([underscore]);
    expect(ids(await list({ q: "\\" }))).toEqual([backslash]);
    expect(searchPattern("a%b_c\\d")).toBe("%a\\%b\\_c\\\\d%");
  });

  it("filters by type and by source, alone and together, and a blank filter is no filter", async () => {
    const vcSummit = await insertInvestor(db, { investorType: "vc", source: "websummit" });
    const vcIntro = await insertInvestor(db, { investorType: "vc", source: "intro" });
    const angelIntro = await insertInvestor(db, { investorType: "angel", source: "intro" });
    const all = [vcSummit, vcIntro, angelIntro];
    const sorted = (ids) => [...ids].sort();
    const found = async (query) => sorted(fixtureIds(await list(query), all));
    expect(await found({ type: "vc" })).toEqual(sorted([vcSummit, vcIntro]));
    expect(await found({ source: "intro" })).toEqual(sorted([vcIntro, angelIntro]));
    expect(await found({ type: "vc", source: "intro" })).toEqual([vcIntro]);
    expect(await found({ type: "", source: "" })).toEqual(sorted(all));
    expect((await list({ type: "corporate" })).body).toMatchObject({ investors: [], total: 0 });
  });

  it("pages 50 at a time, with the total of the whole match", async () => {
    await db.query(
      `INSERT INTO investors.investors (clerk_user_id, email, name, firm)
       SELECT 'user_page_' || n, 'page' || n || '@example.com', 'Paging Example ' || lpad(n::text, 2, '0'), 'Paging Example'
         FROM generate_series(1, 55) AS n`,
    );
    const query = { q: "paging example", sort: "name", dir: "asc" };
    const first = await list(query);
    expect(first.body).toMatchObject({ total: 55, page: 1, pageSize: 50 });
    expect(first.body.investors).toHaveLength(50);
    expect(first.body.investors[0].name).toBe("Paging Example 01");
    const second = await list({ ...query, page: "2" });
    expect(second.body.investors.map((row) => row.name)).toEqual([51, 52, 53, 54, 55].map((n) => `Paging Example ${n}`));
    expect((await list({ ...query, page: "3" })).body).toMatchObject({ investors: [], total: 55, page: 3 });
  });
});

describe("GET /admin/investors: deck progress", () => {
  it("follows the alert-on-first-open document the investor opened most, capped at its page count", async () => {
    const deck = await insertDocument(db, { title: "Example deck", alertOnFirstOpen: true, pageCount: 12, version: 2 });
    const onePager = await insertDocument(db, { title: "Example one-pager", alertOnFirstOpen: true, pageCount: 2, version: 2 });
    const notes = await insertDocument(db, { title: "Example notes", pageCount: 30 });
    const ada = await insertInvestor(db, { name: "Ada Example" });
    const ben = await insertInvestor(db, { name: "Ben Example" });
    const cy = await insertInvestor(db, { name: "Cy Example" });
    const dee = await insertInvestor(db, { name: "Dee Example" });
    await insertEvents(db, ada, [
      ...repeat("document_open", deck, 2),
      pageView(deck, 9, 1000, 2),
      ...repeat("document_open", onePager, 3),
      pageView(onePager, 1, 1000, 2),
      pageView(onePager, 5, 1000, 1),
    ]);
    await insertEvents(db, ben, [
      ...repeat("document_open", notes, 5),
      pageView(notes, 30),
      { type: "document_open", documentId: deck },
      pageView(deck, 3, 1000, 2),
      pageView(deck, 7, 1000, 1),
      pageView(deck, 5, 1000, 2),
    ]);
    await insertEvents(db, cy, [...repeat("document_open", notes, 2), { type: "document_download", documentId: deck }]);
    await insertEvents(db, dee, [{ type: "document_open", documentId: deck }]);
    const res = await list({ sort: "name", dir: "asc" });
    const progress = Object.fromEntries(res.body.investors.map((row) => [row.id, row.deckProgress]));
    expect(progress[ada]).toEqual({ documentId: onePager, maxPage: 2, pageCount: 2 });
    expect(progress[ben]).toEqual({ documentId: deck, maxPage: 7, pageCount: 12 });
    expect(progress[cy]).toBeNull();
    expect(progress[dee]).toEqual({ documentId: deck, maxPage: 0, pageCount: 12 });
  });

  it("breaks a tie in opens by the latest open, and ignores a document no longer flagged", async () => {
    const deck = await insertDocument(db, { alertOnFirstOpen: true, pageCount: 12 });
    const onePager = await insertDocument(db, { alertOnFirstOpen: true, pageCount: 2 });
    const ada = await insertInvestor(db);
    const ben = await insertInvestor(db);
    await insertEvents(db, ada, [
      { type: "document_open", documentId: deck, minutesAgo: 10 },
      { type: "document_open", documentId: onePager, minutesAgo: 5 },
    ]);
    await insertEvents(db, ben, [
      { type: "document_open", documentId: onePager, minutesAgo: 10 },
      { type: "document_open", documentId: deck, minutesAgo: 5 },
    ]);
    const progressOf = async (id) => (await list({ q: id })).body.investors[0].deckProgress;
    expect(await progressOf(ada)).toEqual({ documentId: onePager, maxPage: 0, pageCount: 2 });
    expect(await progressOf(ben)).toEqual({ documentId: deck, maxPage: 0, pageCount: 12 });
    await db.query("UPDATE investors.documents SET alert_on_first_open = false WHERE id = $1", [onePager]);
    expect(await progressOf(ada)).toEqual({ documentId: deck, maxPage: 0, pageCount: 12 });
  });
});

describe("GET /admin/investors: query validation and the gate", () => {
  it.each([
    [{ q: "x".repeat(LIST_LIMITS.q + 1) }, { q: "too_long" }],
    [{ type: "whale" }, { type: "invalid_option" }],
    [{ source: "billboard" }, { source: "invalid_option" }],
    [{ sort: "email" }, { sort: "invalid_option" }],
    [{ sort: "name; DROP TABLE investors.investors" }, { sort: "invalid_option" }],
    [{ dir: "sideways" }, { dir: "invalid_option" }],
    [{ page: "0" }, { page: "invalid" }],
    [{ page: "two" }, { page: "invalid" }],
    [{ page: String(LIST_LIMITS.page + 1) }, { page: "invalid" }],
  ])("answers 400 invalid for %o", async (query, fields) => {
    const res = await list(query);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields });
  });

  it("refuses a repeated parameter (an array) instead of guessing", async () => {
    const res = await request(app).get("/api/investors/admin/investors?q=a&q=b").set("Authorization", bearer(ADMIN.id));
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields: { q: "invalid" } });
  });

  it("answers 403 forbidden to an investor who is not an admin, and 401 without a token", async () => {
    await insertInvestor(db);
    const res = await list({}, ADA);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "forbidden" });
    expect((await request(app).get("/api/investors/admin/investors")).status).toBe(401);
  });
});
