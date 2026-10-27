/**
 * The admin overview (W1-16) through the portal's own apiRouter, over the
 * test database with fixture rows: the 7-day counts at their boundaries,
 * the zero-filled 30-day series in UTC days, the latest events (newest
 * first, at most 20, with their investor and document) and the admin gate.
 *
 * The admin's first request creates the admin's own investor row and its
 * signed_in event (auth.js). Each test starts from primeAdmin(), which moves
 * that row's creation outside every window and removes its events, so the
 * admin adds exactly 1 to investorsTotal and nothing else.
 */
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import { LATEST_EVENTS, SERIES_DAYS, WINDOW_DAYS } from "../queries/overview.js";
import { ADA, ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { insertDocument, insertEvents, insertInvestor, pageView, repeat } from "./helpers/investor-fixtures.js";
import { createTestDb } from "./helpers/test-db.js";

const ENV = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
  INVESTOR_ADMIN_CLERK_IDS: ADMIN.id,
});

const MINUTE = 1;
const DAY_MINUTES = 24 * 60;
const WINDOW_MINUTES = WINDOW_DAYS * DAY_MINUTES;
const DAY_MS = DAY_MINUTES * 60_000;

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
  await primeAdmin();
});

const overview = (who = ADMIN) => request(app).get("/api/investors/admin/overview").set("Authorization", bearer(who.id));

async function primeAdmin() {
  expect((await request(app).get("/api/investors/me").set("Authorization", bearer(ADMIN.id))).status).toBe(200);
  const { rows } = await db.query(
    "UPDATE investors.investors SET created_at = now() - interval '90 days' WHERE clerk_user_id = $1 RETURNING id",
    [ADMIN.id],
  );
  await db.query("DELETE FROM investors.events WHERE investor_id = $1", [rows[0].id]);
}

/** @param {string} investorId @param {Date} at */
const setCreatedAt = (investorId, at) =>
  db.query("UPDATE investors.investors SET created_at = $2 WHERE id = $1", [investorId, at.toISOString()]);

/** Midnight UTC, `days` days before today's (negative: after). */
function utcMidnight(days) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
}

const dayOf = (date) => date.toISOString().slice(0, 10);

/** The series' dates: SERIES_DAYS UTC days, oldest first, today last. */
const seriesDates = () => Array.from({ length: SERIES_DAYS }, (_, i) => dayOf(utcMidnight(SERIES_DAYS - 1 - i)));

/** @param {{date: string}[]} series @param {Date} at */
const dayIn = (series, at) => series.find((day) => day.date === dayOf(at));

describe("GET /admin/overview: the 7-day counts", () => {
  it("answers zeros and an empty list with nothing but the admin's own row", async () => {
    const res = await overview();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      investorsTotal: 1,
      investorsNew7d: 0,
      activeInvestors7d: 0,
      deckOpens7d: 0,
      downloads7d: 0,
      series: seriesDates().map((date) => ({ date, signups: 0, activeInvestors: 0 })),
      latestEvents: [],
    });
  });

  it("counts new investors from exactly 7 days back", async () => {
    await insertInvestor(db, { createdDaysAgo: WINDOW_DAYS - 1 / DAY_MINUTES });
    await insertInvestor(db, { createdDaysAgo: 1 });
    await insertInvestor(db, { createdDaysAgo: WINDOW_DAYS + 1 / DAY_MINUTES });
    const res = await overview();
    expect(res.body).toMatchObject({ investorsTotal: 4, investorsNew7d: 2 });
  });

  it("counts an investor active once, by any event inside the window", async () => {
    const doc = await insertDocument(db);
    const ada = await insertInvestor(db, { createdDaysAgo: 30 });
    const ben = await insertInvestor(db, { createdDaysAgo: 30, name: "Ben Sample" });
    const cy = await insertInvestor(db, { createdDaysAgo: 30, name: "Cy Placeholder" });
    await insertEvents(db, ada, [{ type: "signed_in", minutesAgo: WINDOW_MINUTES - MINUTE }, pageView(doc, 2)]);
    await insertEvents(db, ben, [{ type: "section_view", durationMs: 500, data: { section: "team" }, minutesAgo: 10 }]);
    await insertEvents(db, cy, [{ type: "signed_in", minutesAgo: WINDOW_MINUTES + MINUTE }]);
    expect((await overview()).body.activeInvestors7d).toBe(2);
  });

  it("counts deck opens only on alert-on-first-open documents, and every download, inside the window", async () => {
    const deck = await insertDocument(db, { title: "Example deck", alertOnFirstOpen: true });
    const notes = await insertDocument(db, { title: "Example notes" });
    const ada = await insertInvestor(db, { createdDaysAgo: 30 });
    await insertEvents(db, ada, [
      ...repeat("document_open", deck, 2),
      { type: "document_open", documentId: deck, minutesAgo: WINDOW_MINUTES - MINUTE },
      { type: "document_open", documentId: deck, minutesAgo: WINDOW_MINUTES + MINUTE },
      ...repeat("document_open", notes, 3),
      ...repeat("document_download", notes, 2),
      { type: "document_download", documentId: deck, minutesAgo: WINDOW_MINUTES - MINUTE },
      { type: "document_download", documentId: deck, minutesAgo: WINDOW_MINUTES + MINUTE },
    ]);
    const res = await overview();
    expect(res.body).toMatchObject({ deckOpens7d: 3, downloads7d: 3, activeInvestors7d: 1 });
  });
});

describe("GET /admin/overview: the 30-day series", () => {
  it("answers one row per UTC day, oldest first, today last, zero-filled", async () => {
    const ada = await insertInvestor(db, { createdDaysAgo: 3 });
    await insertEvents(db, ada, [{ type: "signed_in", minutesAgo: 3 * DAY_MINUTES }]);
    const { series } = (await overview()).body;
    expect(series.map((day) => day.date)).toEqual(seriesDates());
    const busy = dayOf(new Date(Date.now() - 3 * DAY_MS));
    for (const day of series) {
      const expected = day.date === busy ? { signups: 1, activeInvestors: 1 } : { signups: 0, activeInvestors: 0 };
      expect(day).toEqual({ date: day.date, ...expected });
    }
  });

  it("buckets sign-ups by UTC day, from the first day's midnight to the last millisecond of a day", async () => {
    const yesterday = utcMidnight(1);
    const placements = [
      yesterday,
      new Date(utcMidnight(0).getTime() - 1),
      new Date(yesterday.getTime() - 1),
      utcMidnight(SERIES_DAYS - 1),
      new Date(utcMidnight(SERIES_DAYS - 1).getTime() - 1),
    ];
    for (const at of placements) await setCreatedAt(await insertInvestor(db), at);
    const { series } = (await overview()).body;
    expect(dayIn(series, yesterday).signups).toBe(2);
    expect(dayIn(series, utcMidnight(2)).signups).toBe(1);
    expect(series[0]).toMatchObject({ date: dayOf(utcMidnight(SERIES_DAYS - 1)), signups: 1 });
    expect(series.reduce((sum, day) => sum + day.signups, 0)).toBe(4);
  });

  it("counts each investor active once per day, whatever the events", async () => {
    const doc = await insertDocument(db);
    const ada = await insertInvestor(db, { createdDaysAgo: 60 });
    const ben = await insertInvestor(db, { createdDaysAgo: 60, name: "Ben Sample" });
    const fiveDays = 5 * DAY_MINUTES;
    await insertEvents(db, ada, [
      { type: "document_open", documentId: doc, minutesAgo: fiveDays },
      { ...pageView(doc, 1), minutesAgo: fiveDays },
      { ...pageView(doc, 2), minutesAgo: fiveDays },
    ]);
    await insertEvents(db, ben, [{ type: "signed_in", minutesAgo: fiveDays }]);
    await insertEvents(db, ben, [{ type: "signed_in", minutesAgo: (SERIES_DAYS + 1) * DAY_MINUTES }]);
    const { series } = (await overview()).body;
    expect(dayIn(series, new Date(Date.now() - fiveDays * 60_000)).activeInvestors).toBe(2);
    expect(series.reduce((sum, day) => sum + day.activeInvestors, 0)).toBe(2);
    expect(series.reduce((sum, day) => sum + day.signups, 0)).toBe(0);
  });
});

describe("GET /admin/overview: the latest events", () => {
  it("answers the newest 20, newest first, each with its investor and document", async () => {
    const deck = await insertDocument(db, { title: "Example deck" });
    const ada = await insertInvestor(db, { email: "ada@example.com", createdDaysAgo: 40 });
    const ben = await insertInvestor(db, { name: null, firm: null, email: "ben@example.com", createdDaysAgo: 40 });
    const older = Array.from({ length: LATEST_EVENTS }, (_, i) => ({ type: "signed_in", minutesAgo: 100 + i }));
    await insertEvents(db, ben, older);
    await insertEvents(db, ada, [
      { ...pageView(deck, 4, 2500), minutesAgo: 2 },
      { type: "document_open", documentId: deck, minutesAgo: 1 },
    ]);
    const { latestEvents } = (await overview()).body;
    expect(latestEvents).toHaveLength(LATEST_EVENTS);
    const times = latestEvents.map((event) => Date.parse(event.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(latestEvents[0]).toEqual({
      id: expect.any(Number),
      type: "document_open",
      sessionId: null,
      documentId: deck,
      documentTitle: "Example deck",
      documentVersion: 1,
      page: null,
      durationMs: null,
      data: null,
      createdAt: expect.any(String),
      investorId: ada,
      investorName: "Ada Example",
      investorFirm: "Example Ventures",
      investorEmail: "ada@example.com",
    });
    expect(latestEvents[1]).toMatchObject({ type: "page_view", page: 4, durationMs: 2500, investorId: ada });
    expect(latestEvents.at(-1)).toMatchObject({
      type: "signed_in",
      investorId: ben,
      investorName: null,
      investorFirm: null,
      investorEmail: "ben@example.com",
      documentId: null,
      documentTitle: null,
    });
  });

  it("orders events of the same moment by id, newest first, and keeps a deleted document's events untitled", async () => {
    const gone = await insertDocument(db, { title: "Example removed" });
    const ada = await insertInvestor(db, { createdDaysAgo: 40 });
    await insertEvents(db, ada, [{ type: "document_open", documentId: gone }, { type: "document_download", documentId: gone }]);
    await db.query("UPDATE investors.events SET created_at = now() - interval '1 hour' WHERE investor_id = $1", [ada]);
    await db.query("DELETE FROM investors.documents WHERE id = $1", [gone]);
    const { latestEvents } = (await overview()).body;
    expect(latestEvents.map((event) => event.type)).toEqual(["document_download", "document_open"]);
    expect(latestEvents[0].id).toBeGreaterThan(latestEvents[1].id);
    expect(latestEvents[0]).toMatchObject({ documentId: null, documentTitle: null });
  });
});

describe("GET /admin/overview: the admin gate", () => {
  it("answers 403 forbidden to a signed-in investor who is not an admin", async () => {
    const res = await overview(ADA);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "forbidden" });
  });
});
