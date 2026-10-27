/**
 * Upload and finalize refusals of the admin documents API (W1-09): KP11's
 * limits before signing and again on the stored object, keys that are not
 * this upload's, stale and repeated finalizes, and a store that fails.
 */
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import { DOCUMENT_LIMITS } from "../routes/admin-documents.js";
import { MAX_UPLOAD_BYTES } from "../s3.js";
import { ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { fakeDocStore } from "./helpers/fake-doc-store.js";
import { createTestDb } from "./helpers/test-db.js";

const ENV = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
  INVESTOR_ADMIN_CLERK_IDS: ADMIN.id,
});

const NEW_DOC = Object.freeze({ title: "Example deck", category: "Pitch", kind: "pdf" });
const DECK = Object.freeze({ fileName: "Example Deck.pdf", contentType: "application/pdf", contentLength: 18_432, pageCount: 12 });
const CSV = Object.freeze({ fileName: "numbers.csv", contentType: "text/csv", contentLength: 2_048, pageCount: 3 });

/** @type {import("../db.js").Db} */
let db;
let app;
let files;
let logger;
let doc;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(() => db.end());
beforeEach(async () => {
  logger = { warn: vi.fn(), error: vi.fn() };
  files = fakeDocStore();
  const portal = createInvestorsPortal({
    env: ENV,
    deps: { logger, createDb: () => db, docStore: files.store, ...fakeAuthDeps() },
  });
  await portal.start();
  await db.query("DELETE FROM investors.documents");
  app = express().use("/api/investors", portal.apiRouter);
  doc = (await post("/admin/documents", NEW_DOC)).body.document;
});

const post = (path, body) => request(app).post(`/api/investors${path}`).set("Authorization", bearer(ADMIN.id)).send(body);
const uploadUrl = (body, id = doc.id) => post(`/admin/documents/${id}/upload-url`, body);
const finalize = (body, id = doc.id) => post(`/admin/documents/${id}/finalize`, body);

/** Signs, "uploads" what the store will report, and returns the key. */
async function stored(file = DECK, object = { size: file.contentLength, contentType: file.contentType }) {
  const res = await uploadUrl(file);
  expect(res.status).toBe(200);
  files.putObject(res.body.key, object);
  return res.body.key;
}

async function documentRow() {
  const { rows } = await db.query("SELECT * FROM investors.documents WHERE id = $1", [doc.id]);
  return rows[0];
}

describe("POST /admin/documents/:id/upload-url", () => {
  it.each([
    [{ contentType: "text/html" }, "content_type_not_allowed"],
    [{ contentType: "application/pdf; charset=binary" }, "content_type_not_allowed"],
    [{ contentLength: MAX_UPLOAD_BYTES + 1 }, "file_too_large"],
    [{ contentLength: 0 }, "invalid_size"],
    [{ contentLength: 10.5 }, "invalid_size"],
  ])("refuses %j with 400 %s, before signing anything", async (change, code) => {
    const res = await uploadUrl({ ...DECK, ...change });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: code });
  });

  it("accepts the largest allowed file", async () => {
    const res = await uploadUrl({ ...DECK, contentLength: MAX_UPLOAD_BYTES });
    expect(res.status).toBe(200);
  });

  it.each([
    [{ fileName: undefined }, { fileName: "required" }],
    [{ fileName: "x".repeat(DOCUMENT_LIMITS.fileName + 1) }, { fileName: "too_long" }],
    [{ contentType: undefined }, { contentType: "required" }],
    [{ contentLength: undefined }, { contentLength: "required" }],
    [{ contentLength: "18432" }, { contentLength: "invalid" }],
    [{ pageCount: 0 }, { pageCount: "invalid" }],
    [{ pageCount: DOCUMENT_LIMITS.pageCount + 1 }, { pageCount: "invalid" }],
    [{ pageCount: 2.5 }, { pageCount: "invalid" }],
  ])("refuses %j with 400 invalid %j", async (change, fields) => {
    const res = await uploadUrl({ ...DECK, ...change });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields });
    expect(files.store.presignPut).not.toHaveBeenCalled();
  });

  it("keeps only the file name's last segment, made safe, in the key", async () => {
    const res = await uploadUrl({ ...DECK, fileName: "../../etc/Deck (final).pdf" });
    expect(res.body.key).toBe(`documents/${doc.id}/v1/Deck-final.pdf`);
  });
});

describe("POST /admin/documents/:id/finalize", () => {
  it("records no page count for a file that is not a PDF", async () => {
    const key = await stored(CSV);
    const res = await finalize({ key, pageCount: CSV.pageCount });
    expect(res.status).toBe(200);
    expect(res.body.document).toMatchObject({ contentType: "text/csv", pageCount: null, sizeBytes: CSV.contentLength });
  });

  it("answers 409 not_uploaded when the object is not in the bucket", async () => {
    const res = await uploadUrl(DECK);
    const done = await finalize({ key: res.body.key });
    expect(done.status).toBe(409);
    expect(done.body).toEqual({ error: "not_uploaded" });
    expect((await documentRow()).s3_key).toBeNull();
  });

  it.each([
    [{ size: 18_432, contentType: "text/html" }, "content_type_not_allowed"],
    [{ size: 18_432, contentType: null }, "content_type_not_allowed"],
    [{ size: MAX_UPLOAD_BYTES + 1, contentType: "application/pdf" }, "file_too_large"],
    [{ size: null, contentType: "application/pdf" }, "invalid_size"],
  ])("checks the stored object %j again: 400 %s, the object removed, nothing recorded", async (object, code) => {
    const key = await stored(DECK, object);
    const res = await finalize({ key });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: code });
    expect(files.has(key)).toBe(false);
    expect(await documentRow()).toMatchObject({ s3_key: null, version: 1, size_bytes: null });
  });

  it.each([
    ["another document's key", () => `documents/00000000-0000-4000-8000-000000000000/v1/Example-Deck.pdf`],
    ["a key outside documents/", (id) => `uploads/${id}/v1/Example-Deck.pdf`],
    ["an unsafe file name", (id) => `documents/${id}/v1/../Example-Deck.pdf`],
    ["a name safeFileName would change", (id) => `documents/${id}/v1/Example Deck.pdf`],
    ["a version beyond integer", (id) => `documents/${id}/v9999999999/Example-Deck.pdf`],
    ["a zero version", (id) => `documents/${id}/v0/Example-Deck.pdf`],
    ["a nested path", (id) => `documents/${id}/v1/a/Example-Deck.pdf`],
  ])("refuses %s with 400 invalid key and never asks the store", async (_label, keyFor) => {
    const res = await finalize({ key: keyFor(doc.id) });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields: { key: "invalid" } });
    expect(files.store.head).not.toHaveBeenCalled();
  });

  it("refuses a missing key or a bad page count", async () => {
    expect((await finalize({})).body).toEqual({ error: "invalid", fields: { key: "required" } });
    const key = await stored();
    expect((await finalize({ key, pageCount: -1 })).body).toEqual({ error: "invalid", fields: { pageCount: "invalid" } });
  });

  it("answers 409 stale_upload to a second finalize of the same key, and keeps the file", async () => {
    const key = await stored();
    expect((await finalize({ key, pageCount: 12 })).status).toBe(200);
    const again = await finalize({ key, pageCount: 12 });
    expect(again.status).toBe(409);
    expect(again.body).toEqual({ error: "stale_upload" });
    expect(files.has(key)).toBe(true);
    expect(files.store.remove).not.toHaveBeenCalled();
    expect(await documentRow()).toMatchObject({ s3_key: key, version: 1 });
  });

  it("never checks, so never removes, the current file when a stale finalize names it", async () => {
    const key = await stored();
    await finalize({ key });
    files.putObject(key, { size: DECK.contentLength, contentType: "text/html" });
    const res = await finalize({ key });
    expect(res.status).toBe(409);
    expect(files.has(key)).toBe(true);
    expect(files.store.remove).not.toHaveBeenCalled();
  });

  it("answers 409 stale_upload when another upload was finalized first, and removes the stale upload", async () => {
    const mine = await stored(DECK);
    const theirs = await stored({ ...DECK, fileName: "Other.pdf" });
    expect((await finalize({ key: theirs })).status).toBe(200);
    const res = await finalize({ key: mine });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "stale_upload" });
    expect(await documentRow()).toMatchObject({ s3_key: theirs, version: 1 });
    expect(files.has(mine)).toBe(false);
    expect(files.has(theirs)).toBe(true);
  });

  it("answers 409 stale_upload when another finalize lands while this one checks its object", async () => {
    const mine = await stored(DECK);
    const theirs = await stored({ ...DECK, fileName: "Other.pdf" });
    const head = files.store.head.getMockImplementation();
    files.store.head.mockImplementationOnce(async (key) => {
      expect((await finalize({ key: theirs })).status).toBe(200);
      return head(key);
    });
    const res = await finalize({ key: mine });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "stale_upload" });
    expect(await documentRow()).toMatchObject({ s3_key: theirs, version: 1 });
    expect(files.has(theirs)).toBe(true);
    expect(files.has(mine)).toBe(false);
  });

  it("answers 404 and removes the upload when the document is deleted while it is checked", async () => {
    const key = await stored();
    const head = files.store.head.getMockImplementation();
    files.store.head.mockImplementationOnce(async (asked) => {
      const deleted = await request(app).delete(`/api/investors/admin/documents/${doc.id}`).set("Authorization", bearer(ADMIN.id));
      expect(deleted.status).toBe(204);
      return head(asked);
    });
    const res = await finalize({ key });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
    expect(files.has(key)).toBe(false);
  });

  it("fails 500 when the store cannot HEAD the object, logging no URL", async () => {
    const key = await stored();
    files.store.head.mockRejectedValueOnce(Object.assign(new Error("Forbidden"), { name: "Forbidden" }));
    const res = await finalize({ key });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal_error" });
    expect((await documentRow()).s3_key).toBeNull();
    expect(JSON.stringify(logger.error.mock.calls)).not.toMatch(/https?:|signature/);
  });

  it("still records a replace when the replaced file cannot be removed, and logs its folder, not its name", async () => {
    const first = await stored();
    await finalize({ key: first });
    const second = await stored({ ...DECK, fileName: "Deck v2.pdf" });
    files.store.remove.mockRejectedValueOnce(Object.assign(new Error("Slow Down"), { name: "SlowDown" }));
    const res = await finalize({ key: second });
    expect(res.status).toBe(200);
    expect(res.body.document).toMatchObject({ version: 2, fileName: "Deck-v2.pdf" });
    expect(logger.error).toHaveBeenCalledWith(`[investors] could not remove a file in documents/${doc.id}/v1: SlowDown`);
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("Example-Deck");
  });
});
