/**
 * The investor documents API (W1-11) through the portal's own apiRouter, over
 * the test database and a fake doc store: the library hides what investors
 * may not see, a link writes its event in the same request, the first-open
 * hook, the 404s, the rate limit and the 503 without storage. Documents are
 * written straight into the table; the admin flow is admin-documents.test.js.
 */
import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import { LINK_LIMIT_PER_MINUTE } from "../routes/documents.js";
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
const LIBRARY_FIELDS = [
  "category",
  "contentType",
  "description",
  "fileName",
  "id",
  "kind",
  "pageCount",
  "sizeBytes",
  "title",
  "updatedAt",
  "version",
];

/** Invented (KP5): a published deck with a file, flagged for the first-open alert. */
const DECK = Object.freeze({
  title: "Example deck",
  description: "Where the company is going.",
  category: "Pitch",
  kind: "pdf",
  fileName: "Example-Deck.pdf",
  contentType: "application/pdf",
  sizeBytes: 18_432,
  pageCount: 12,
  version: 1,
  sortOrder: 0,
  published: true,
  alertOnFirstOpen: true,
  withFile: true,
});

/** @type {import("../db.js").Db} */
let db;
let app;
let files;
let alerts;
let logger;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(() => db.end());

/** @param {Record<string, unknown>} deps */
async function mountPortal(deps) {
  const portal = createInvestorsPortal({
    env: ENV,
    deps: { logger, alerts, createDb: () => db, ...fakeAuthDeps(), ...deps },
  });
  await portal.start();
  return express().use("/api/investors", portal.apiRouter);
}

beforeEach(async () => {
  logger = { warn: vi.fn(), error: vi.fn() };
  alerts = { signup: vi.fn(), firstOpen: vi.fn() };
  files = fakeDocStore();
  app = await mountPortal({ docStore: files.store });
  await db.query("DELETE FROM investors.documents");
  await db.query("DELETE FROM investors.investors");
});

const api = (method, path, who = ADA) =>
  request(app)[method](`/api/investors${path}`).set("Authorization", bearer(who.id));
const link = (id, mode, who = ADA) => api("post", `/documents/${id}/link`, who).send({ mode });

/** Lets a deferred alert hook run. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

/** A documents row as the admin flow would leave it; returns its id and key. */
async function insertDoc(overrides = {}) {
  const doc = { ...DECK, ...overrides };
  const id = randomUUID();
  const key = doc.withFile ? documentKey(id, doc.version, doc.fileName) : null;
  await db.query(
    `INSERT INTO investors.documents (id, title, description, category, kind, s3_key, file_name, content_type,
       size_bytes, page_count, version, sort_order, published, alert_on_first_open)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id,
      doc.title,
      doc.description,
      doc.category,
      doc.kind,
      key,
      doc.withFile ? doc.fileName : null,
      doc.withFile ? doc.contentType : null,
      doc.withFile ? doc.sizeBytes : null,
      doc.withFile ? doc.pageCount : null,
      doc.version,
      doc.sortOrder,
      doc.published,
      doc.alertOnFirstOpen,
    ],
  );
  return { id, key };
}

/** @param {string} clerkUserId */
async function investorId(clerkUserId) {
  const { rows } = await db.query("SELECT id FROM investors.investors WHERE clerk_user_id = $1", [clerkUserId]);
  return rows[0].id;
}

async function documentEvents() {
  const { rows } = await db.query(
    `SELECT i.clerk_user_id, e.type, e.document_id, e.document_version, e.session_id, e.page
       FROM investors.events e JOIN investors.investors i ON i.id = e.investor_id
      WHERE e.type IN ('document_open', 'document_download') ORDER BY e.id`,
  );
  return rows;
}

describe("GET /documents", () => {
  it("lists published documents with a file, in sort order, with the library fields only", async () => {
    const second = await insertDoc({ title: "Second", sortOrder: 2 });
    const first = await insertDoc({ title: "First", sortOrder: 1, kind: "spreadsheet", pageCount: null });
    await insertDoc({ title: "Draft", sortOrder: 0, published: false });
    await insertDoc({ title: "No file", sortOrder: 0, withFile: false });
    const res = await api("get", "/documents");
    expect(res.status).toBe(200);
    expect(res.body.documents.map((doc) => doc.id)).toEqual([first.id, second.id]);
    for (const doc of res.body.documents) expect(Object.keys(doc).sort()).toEqual(LIBRARY_FIELDS);
    expect(res.body.documents[1]).toMatchObject({
      title: "Second",
      fileName: DECK.fileName,
      contentType: DECK.contentType,
      sizeBytes: DECK.sizeBytes,
      pageCount: DECK.pageCount,
      version: 1,
    });
    expect(JSON.stringify(res.body)).not.toContain("documents/");
  });

  it("lists nothing when nothing is published, and writes no event", async () => {
    await insertDoc({ published: false });
    const res = await api("get", "/documents");
    expect(res.body).toEqual({ documents: [] });
    expect(await documentEvents()).toEqual([]);
  });
});

describe("POST /documents/:id/link", () => {
  it("inline: a 5-minute inline link to the current file, and a document_open with its version", async () => {
    const { id, key } = await insertDoc({ version: 3 });
    const res = await link(id, "inline");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: expect.stringContaining(key), expiresIn: 300 });
    expect(files.store.presignGet).toHaveBeenCalledWith({ key, fileName: DECK.fileName, disposition: "inline" });
    expect(await documentEvents()).toEqual([
      { clerk_user_id: ADA.id, type: "document_open", document_id: id, document_version: 3, session_id: null, page: null },
    ]);
  });

  it("download: an attachment link and a document_download", async () => {
    const { id, key } = await insertDoc({ alertOnFirstOpen: false });
    const res = await link(id, "download");
    expect(res.status).toBe(200);
    expect(files.store.presignGet).toHaveBeenCalledWith({ key, fileName: DECK.fileName, disposition: "attachment" });
    expect(await documentEvents()).toMatchObject([{ type: "document_download", document_id: id, document_version: 1 }]);
  });

  it("records each link against the investor of the token", async () => {
    const { id } = await insertDoc();
    await link(id, "inline");
    await link(id, "download", ADMIN);
    const events = await documentEvents();
    expect(events.map((event) => [event.clerk_user_id, event.type])).toEqual([
      [ADA.id, "document_open"],
      [ADMIN.id, "document_download"],
    ]);
  });

  it.each([
    ["unpublished", { published: false }],
    ["file-less", { withFile: false }],
  ])("answers 404 for a %s document, signing nothing and recording nothing", async (_label, overrides) => {
    const { id } = await insertDoc(overrides);
    const res = await link(id, "inline");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
    expect(files.store.presignGet).not.toHaveBeenCalled();
    expect(await documentEvents()).toEqual([]);
  });

  it("answers 404 for an unknown or malformed id", async () => {
    for (const id of [UNKNOWN_ID, "not-a-uuid", "1", `${UNKNOWN_ID}x`]) {
      const res = await link(id, "inline");
      expect({ id, status: res.status, body: res.body }).toEqual({ id, status: 404, body: { error: "not_found" } });
    }
    expect(await documentEvents()).toEqual([]);
  });

  it.each([
    [{}, { mode: "required" }],
    [{ mode: "" }, { mode: "required" }],
    [{ mode: "attachment" }, { mode: "invalid_option" }],
    [{ mode: ["inline"] }, { mode: "invalid_option" }],
  ])("refuses %j with 400 invalid %j", async (body, fields) => {
    const { id } = await insertDoc();
    const res = await api("post", `/documents/${id}/link`).send(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields });
    expect(await documentEvents()).toEqual([]);
  });

  it("records nothing and answers 500 when signing fails, logging no URL", async () => {
    const { id } = await insertDoc();
    files.store.presignGet.mockRejectedValueOnce(Object.assign(new Error("Credentials expired"), { name: "ExpiredToken" }));
    const res = await link(id, "inline");
    await settle();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal_error" });
    expect(await documentEvents()).toEqual([]);
    expect(alerts.firstOpen).not.toHaveBeenCalled();
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("https://");
  });

  it("answers 403 blocked to a blocked investor", async () => {
    const { id } = await insertDoc();
    await api("get", "/me");
    await db.query("UPDATE investors.investors SET blocked = true WHERE clerk_user_id = $1", [ADA.id]);
    expect((await link(id, "inline")).body).toEqual({ error: "blocked" });
    expect((await api("get", "/documents")).status).toBe(403);
  });
});

describe("POST /documents/:id/link: the first-open hook", () => {
  it("calls firstOpen once across two opens, after the event, with the investor and the library document", async () => {
    const { id } = await insertDoc();
    await link(id, "inline");
    await link(id, "inline");
    await settle();
    expect(alerts.firstOpen).toHaveBeenCalledTimes(1);
    const [investor, document] = alerts.firstOpen.mock.calls[0];
    expect(investor).toMatchObject({ id: await investorId(ADA.id), email: ADA.email });
    expect(document).toMatchObject({ id, title: DECK.title, version: 1 });
    expect(document).not.toHaveProperty("s3Key");
    expect(await documentEvents()).toHaveLength(2);
  });

  it("counts opens per investor: another investor's first open calls it again", async () => {
    const { id } = await insertDoc();
    await link(id, "inline");
    await link(id, "inline", ADMIN);
    await settle();
    expect(alerts.firstOpen.mock.calls.map(([investor]) => investor.clerkUserId)).toEqual([ADA.id, ADMIN.id]);
  });

  it("is not called for downloads, and a download does not use up the first open", async () => {
    const { id } = await insertDoc();
    await link(id, "download");
    await settle();
    expect(alerts.firstOpen).not.toHaveBeenCalled();
    await link(id, "inline");
    await settle();
    expect(alerts.firstOpen).toHaveBeenCalledTimes(1);
  });

  it("is not called for a document without alert_on_first_open", async () => {
    const { id } = await insertDoc({ alertOnFirstOpen: false });
    await link(id, "inline");
    await settle();
    expect(alerts.firstOpen).not.toHaveBeenCalled();
  });

  it("answers 200 even when the hook throws, logging only the error's name", async () => {
    alerts.firstOpen.mockImplementation(() => {
      throw new Error("smtp said no to ada@example.com");
    });
    const { id } = await insertDoc();
    const res = await link(id, "inline");
    await settle();
    expect(res.status).toBe(200);
    expect(logger.error).toHaveBeenCalledWith("[investors] alert 'firstOpen' failed: Error");
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("ada@example.com");
  });
});

describe("limits and storage", () => {
  it("answers 429 rate_limited on the 31st link in a minute, per investor (KP16)", async () => {
    expect(LINK_LIMIT_PER_MINUTE).toBe(30);
    const { id } = await insertDoc({ alertOnFirstOpen: false });
    for (let i = 0; i < LINK_LIMIT_PER_MINUTE; i += 1) {
      const res = await link(id, i % 2 === 0 ? "inline" : "download");
      expect(res.status).toBe(200);
    }
    const over = await link(id, "inline");
    expect(over.status).toBe(429);
    expect(over.body).toEqual({ error: "rate_limited" });
    expect(await documentEvents()).toHaveLength(LINK_LIMIT_PER_MINUTE);
    expect((await link(id, "inline", ADMIN)).status).toBe(200);
    expect((await api("get", "/documents")).status).toBe(200);
  });

  it("answers 503 storage_unavailable without the S3 config; /me keeps working", async () => {
    app = await mountPortal({ docStore: null });
    const { id } = await insertDoc();
    for (const res of [await api("get", "/documents"), await link(id, "inline")]) {
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: "storage_unavailable" });
    }
    expect((await api("get", "/me")).status).toBe(200);
    expect(await documentEvents()).toEqual([]);
  });
});
