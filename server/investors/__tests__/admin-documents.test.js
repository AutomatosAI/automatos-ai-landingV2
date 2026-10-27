/**
 * The admin documents API (W1-09) through the portal's own apiRouter, over
 * the test database and a fake doc store: the happy path, metadata edits,
 * publishing, preview, delete, the admin gate, bad ids and the 503 without
 * storage. Upload and finalize refusals are in admin-documents-upload.test.js.
 */
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import { DOCUMENT_KINDS } from "../documents.js";
import { DOCUMENT_LIMITS } from "../routes/admin-documents.js";
import { ADA, ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { fakeDocStore } from "./helpers/fake-doc-store.js";
import { createTestDb } from "./helpers/test-db.js";

const ENV = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
  INVESTOR_ADMIN_CLERK_IDS: ADMIN.id,
});

/** Invented (KP5). */
const NEW_DOC = Object.freeze({
  title: "Example deck",
  description: "Where the company is going.",
  category: "Pitch",
  kind: "pdf",
  alertOnFirstOpen: true,
});
const DECK = Object.freeze({ fileName: "Example Deck.pdf", contentType: "application/pdf", contentLength: 18_432, pageCount: 12 });
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

/** @type {import("../db.js").Db} */
let db;
let app;
let files;
let logger;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(() => db.end());

/** @param {Record<string, unknown>} deps */
async function mountPortal(deps) {
  const portal = createInvestorsPortal({ env: ENV, deps: { logger, createDb: () => db, ...fakeAuthDeps(), ...deps } });
  await portal.start();
  return express().use("/api/investors", portal.apiRouter);
}

beforeEach(async () => {
  logger = { warn: vi.fn(), error: vi.fn() };
  files = fakeDocStore();
  app = await mountPortal({ docStore: files.store });
  await db.query("DELETE FROM investors.documents");
  await db.query("DELETE FROM investors.investors");
});

const api = (method, path, who = ADMIN) =>
  request(app)[method](`/api/investors${path}`).set("Authorization", bearer(who.id));

async function createDoc(overrides = {}) {
  const res = await api("post", "/admin/documents").send({ ...NEW_DOC, ...overrides });
  expect(res.status).toBe(201);
  return res.body.document;
}

/** upload-url, the browser's PUT, finalize: the admin screen's sequence. */
async function uploadFile(doc, file = DECK) {
  const link = await api("post", `/admin/documents/${doc.id}/upload-url`).send(file);
  expect(link.status).toBe(200);
  files.putObject(link.body.key, { size: file.contentLength, contentType: file.contentType });
  const done = await api("post", `/admin/documents/${doc.id}/finalize`).send({ key: link.body.key, pageCount: file.pageCount });
  return { link, done };
}

async function documentRow(id) {
  const { rows } = await db.query("SELECT * FROM investors.documents WHERE id = $1", [id]);
  return rows[0];
}

describe("create and list", () => {
  it("lists nothing at first", async () => {
    const res = await api("get", "/admin/documents");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ documents: [] });
  });

  it("creates a document 201, unpublished and without a file, stamped with the admin's Clerk id", async () => {
    const doc = await createDoc();
    expect(doc).toMatchObject({ ...NEW_DOC, version: 1, sortOrder: 0, published: false, hasFile: false, fileName: null });
    expect(doc.id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await documentRow(doc.id)).created_by).toBe(ADMIN.id);
  });

  it("drops unknown keys: a create cannot publish, set a file or a version", async () => {
    const doc = await createDoc({ published: true, s3Key: "documents/x/v1/a.pdf", version: 9, createdBy: "someone" });
    expect(doc).toMatchObject({ published: false, hasFile: false, version: 1 });
    expect(await documentRow(doc.id)).toMatchObject({ s3_key: null, created_by: ADMIN.id });
  });

  it("defaults alertOnFirstOpen to false and stores a blank description as null", async () => {
    const doc = await createDoc({ alertOnFirstOpen: undefined, description: "   " });
    expect(doc).toMatchObject({ alertOnFirstOpen: false, description: null });
  });

  it("puts new documents last and lists by sortOrder, published or not", async () => {
    const first = await createDoc({ title: "First" });
    const second = await createDoc({ title: "Second" });
    expect(second.sortOrder).toBe(first.sortOrder + 1);
    await api("patch", `/admin/documents/${first.id}`).send({ sortOrder: second.sortOrder + 1 });
    const res = await api("get", "/admin/documents");
    expect(res.body.documents.map((doc) => doc.title)).toEqual(["Second", "First"]);
  });

  it.each([
    [{ title: "" }, { title: "required" }],
    [{ title: "x".repeat(DOCUMENT_LIMITS.title + 1) }, { title: "too_long" }],
    [{ title: "Line\nbreak" }, { title: "invalid" }],
    [{ description: "x".repeat(DOCUMENT_LIMITS.description + 1) }, { description: "too_long" }],
    [{ category: undefined }, { category: "required" }],
    [{ category: "x".repeat(DOCUMENT_LIMITS.category + 1) }, { category: "too_long" }],
    [{ kind: "brochure" }, { kind: "invalid_option" }],
    [{ alertOnFirstOpen: "yes" }, { alertOnFirstOpen: "invalid" }],
  ])("refuses %j with 400 invalid %j", async (change, fields) => {
    const res = await api("post", "/admin/documents").send({ ...NEW_DOC, ...change });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields });
  });

  it("offers exactly the kinds of 001_init.sql's CHECK", async () => {
    const { rows } = await db.query(
      `SELECT pg_get_constraintdef(c.oid) AS def FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'investors' AND t.relname = 'documents' AND c.contype = 'c'`,
    );
    const def = rows.map((row) => row.def).find((text) => text.includes("(kind ="));
    expect([...def.matchAll(/'([^']+)'::text/g)].map((match) => match[1]).sort()).toEqual([...DOCUMENT_KINDS].sort());
  });
});

describe("the happy path: create, upload, finalize, publish", () => {
  it("records the file on finalize and publishes it", async () => {
    const doc = await createDoc();
    const { link, done } = await uploadFile(doc);
    expect(link.body).toEqual({
      url: expect.stringMatching(/^https:\/\/uploads\.example\.test\//),
      key: `documents/${doc.id}/v1/Example-Deck.pdf`,
      headers: { "Content-Type": "application/pdf" },
      expiresIn: 900,
    });
    expect(files.store.presignPut).toHaveBeenCalledWith({ key: link.body.key, contentType: DECK.contentType, contentLength: DECK.contentLength });
    expect(done.status).toBe(200);
    expect(done.body.document).toMatchObject({
      hasFile: true,
      fileName: "Example-Deck.pdf",
      contentType: "application/pdf",
      sizeBytes: DECK.contentLength,
      pageCount: DECK.pageCount,
      version: 1,
      published: false,
    });
    const published = await api("patch", `/admin/documents/${doc.id}`).send({ published: true });
    expect(published.status).toBe(200);
    expect(published.body.document).toMatchObject({ published: true, hasFile: true });
    expect((await api("get", "/admin/documents")).body.documents).toEqual([published.body.document]);
  });

  it("a replace bumps the version, removes the replaced file and leaves recorded events on their version", async () => {
    const doc = await createDoc();
    const first = await uploadFile(doc);
    const ada = (await api("get", "/me", ADA)).body.investor;
    await db.query(
      "INSERT INTO investors.events (investor_id, type, document_id, document_version) VALUES ($1, 'document_open', $2, 1)",
      [ada.id, doc.id],
    );
    const second = await uploadFile(doc, { ...DECK, fileName: "Deck v2.pdf", contentLength: 20_000, pageCount: 14 });
    expect(second.link.body.key).toBe(`documents/${doc.id}/v2/Deck-v2.pdf`);
    expect(second.done.body.document).toMatchObject({ version: 2, fileName: "Deck-v2.pdf", sizeBytes: 20_000, pageCount: 14 });
    expect(files.store.remove).toHaveBeenCalledWith(first.link.body.key);
    expect(files.has(first.link.body.key)).toBe(false);
    expect(files.has(second.link.body.key)).toBe(true);
    const { rows } = await db.query("SELECT document_version FROM investors.events WHERE document_id = $1", [doc.id]);
    expect(rows).toEqual([{ document_version: 1 }]);
  });

  it("never answers with the s3 key, except upload-url's echo of the key it signed", async () => {
    const doc = await createDoc();
    const { link, done } = await uploadFile(doc);
    const answers = [
      done,
      await api("patch", `/admin/documents/${doc.id}`).send({ published: true }),
      await api("get", "/admin/documents"),
      await api("post", `/admin/documents/${doc.id}/preview-link`),
    ];
    for (const res of answers) expect(JSON.stringify(res.body)).not.toMatch(/s3_?key/i);
    for (const res of answers.slice(0, 3)) expect(JSON.stringify(res.body)).not.toContain(link.body.key);
  });
});

describe("PATCH /admin/documents/:id", () => {
  it("refuses to publish a document without a file: 409 no_file, nothing saved", async () => {
    const doc = await createDoc();
    const res = await api("patch", `/admin/documents/${doc.id}`).send({ published: true, title: "Renamed" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "no_file" });
    expect(await documentRow(doc.id)).toMatchObject({ published: false, title: NEW_DOC.title });
  });

  it("edits only the fields sent; a null description clears it; unpublishing works", async () => {
    const doc = await createDoc();
    await uploadFile(doc);
    await api("patch", `/admin/documents/${doc.id}`).send({ published: true });
    const res = await api("patch", `/admin/documents/${doc.id}`).send({
      title: "  Renamed  ",
      description: null,
      kind: "slides",
      sortOrder: 7,
      alertOnFirstOpen: false,
      published: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.document).toMatchObject({
      title: "Renamed",
      description: null,
      category: NEW_DOC.category,
      kind: "slides",
      sortOrder: 7,
      alertOnFirstOpen: false,
      published: false,
      hasFile: true,
    });
  });

  it.each([
    [{}, {}],
    [{ s3Key: "documents/x/v1/a.pdf", version: 3 }, {}],
    [{ title: "" }, { title: "required" }],
    [{ title: null }, { title: "required" }],
    [{ category: "x".repeat(DOCUMENT_LIMITS.category + 1) }, { category: "too_long" }],
    [{ kind: "brochure" }, { kind: "invalid_option" }],
    [{ sortOrder: -1 }, { sortOrder: "invalid" }],
    [{ sortOrder: 1.5 }, { sortOrder: "invalid" }],
    [{ sortOrder: DOCUMENT_LIMITS.sortOrder + 1 }, { sortOrder: "invalid" }],
    [{ sortOrder: "3" }, { sortOrder: "invalid" }],
    [{ published: "yes" }, { published: "invalid" }],
    [{ alertOnFirstOpen: 1 }, { alertOnFirstOpen: "invalid" }],
  ])("refuses %j with 400 invalid %j", async (body, fields) => {
    const doc = await createDoc();
    const res = await api("patch", `/admin/documents/${doc.id}`).send(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields });
  });
});

describe("POST /admin/documents/:id/preview-link", () => {
  it("answers an inline presigned GET for an unpublished document and writes no event", async () => {
    const doc = await createDoc();
    await uploadFile(doc);
    const res = await api("post", `/admin/documents/${doc.id}/preview-link`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: expect.stringMatching(/^https:\/\/files\.example\.test\//), expiresIn: 300 });
    expect(files.store.presignGet).toHaveBeenCalledWith({
      key: `documents/${doc.id}/v1/Example-Deck.pdf`,
      fileName: "Example-Deck.pdf",
      disposition: "inline",
    });
    const { rows } = await db.query("SELECT count(*) AS n FROM investors.events WHERE document_id IS NOT NULL");
    expect(rows[0].n).toBe(0);
  });

  it("answers 409 no_file before a file is uploaded", async () => {
    const doc = await createDoc();
    const res = await api("post", `/admin/documents/${doc.id}/preview-link`);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "no_file" });
    expect(files.store.presignGet).not.toHaveBeenCalled();
  });
});

describe("DELETE /admin/documents/:id", () => {
  it("removes the stored file, then the row; events stay with document_id NULL", async () => {
    const doc = await createDoc();
    const { link } = await uploadFile(doc);
    const ada = (await api("get", "/me", ADA)).body.investor;
    await db.query("INSERT INTO investors.events (investor_id, type, document_id, document_version) VALUES ($1, 'document_download', $2, 1)", [
      ada.id,
      doc.id,
    ]);
    const res = await api("delete", `/admin/documents/${doc.id}`);
    expect(res.status).toBe(204);
    expect(files.store.remove).toHaveBeenCalledWith(link.body.key);
    expect(files.has(link.body.key)).toBe(false);
    expect(await documentRow(doc.id)).toBeUndefined();
    const { rows } = await db.query("SELECT type, document_id, document_version FROM investors.events WHERE type = 'document_download'");
    expect(rows).toEqual([{ type: "document_download", document_id: null, document_version: 1 }]);
  });

  it("deletes a document without a file without asking the store", async () => {
    const doc = await createDoc();
    expect((await api("delete", `/admin/documents/${doc.id}`)).status).toBe(204);
    expect(files.store.remove).not.toHaveBeenCalled();
  });

  it("leaves the file alone when the row cannot be deleted", async () => {
    const doc = await createDoc();
    const { link } = await uploadFile(doc);
    const refuseDelete = (client) => ({
      ...client,
      query: (text, params) =>
        text.startsWith("DELETE FROM investors.documents") ? Promise.reject(new Error("deadlock detected")) : client.query(text, params),
    });
    const flaky = Object.freeze({ ...db, tx: (fn) => db.tx((client) => fn(refuseDelete(client))) });
    app = await mountPortal({ docStore: files.store, createDb: () => flaky });
    const res = await api("delete", `/admin/documents/${doc.id}`);
    expect(res.status).toBe(500);
    expect(files.store.remove).not.toHaveBeenCalled();
    expect(files.has(link.body.key)).toBe(true);
    expect(await documentRow(doc.id)).toBeDefined();
  });

  it("keeps the row when the store fails, so the admin can retry (500, logged without a URL)", async () => {
    const doc = await createDoc();
    await uploadFile(doc);
    files.store.remove.mockRejectedValueOnce(Object.assign(new Error("Access Denied"), { name: "AccessDenied" }));
    const res = await api("delete", `/admin/documents/${doc.id}`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal_error" });
    expect(await documentRow(doc.id)).toBeDefined();
    expect(JSON.stringify(logger.error.mock.calls)).not.toMatch(/https?:/);
  });
});

/** Every route with a sample body that passes validation. */
const ROUTES = Object.freeze([
  ["get", "/admin/documents", undefined],
  ["post", "/admin/documents", NEW_DOC],
  ["patch", "/admin/documents/:id", { title: "Renamed" }],
  ["delete", "/admin/documents/:id", undefined],
  ["post", "/admin/documents/:id/upload-url", DECK],
  ["post", "/admin/documents/:id/finalize", { key: `documents/${UNKNOWN_ID}/v1/Example-Deck.pdf` }],
  ["post", "/admin/documents/:id/preview-link", undefined],
]);
const ID_ROUTES = ROUTES.filter(([, path]) => path.includes(":id"));

describe("access, ids and storage", () => {
  it.each(ROUTES)("%s %s answers 403 forbidden to a signed-in non-admin", async (method, path, body) => {
    const doc = await createDoc();
    const res = await api(method, path.replace(":id", doc.id), ADA).send(body);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "forbidden" });
    expect(await documentRow(doc.id)).toMatchObject({ title: NEW_DOC.title });
  });

  it.each(ID_ROUTES)("%s %s answers 404 for an unknown or malformed id", async (method, path, body) => {
    for (const id of [UNKNOWN_ID, "not-a-uuid", "1", `${UNKNOWN_ID}x`]) {
      const res = await api(method, path.replace(":id", id)).send(body);
      expect({ id, status: res.status, body: res.body }).toEqual({ id, status: 404, body: { error: "not_found" } });
    }
  });

  it("answers 503 storage_unavailable on every route without the S3 config; /me keeps working", async () => {
    app = await mountPortal({});
    for (const [method, path, body] of ROUTES) {
      const res = await api(method, path.replace(":id", UNKNOWN_ID)).send(body);
      expect({ path, status: res.status, body: res.body }).toEqual({ path, status: 503, body: { error: "storage_unavailable" } });
    }
    expect((await api("get", "/me")).status).toBe(200);
  });

  it("builds the real store from the S3 config: upload-url signs offline for 15 minutes, and nothing is logged", async () => {
    const s3Env = {
      INVESTOR_DOCS_BUCKET: "example-investor-docs",
      INVESTOR_DOCS_REGION: "eu-west-2",
      INVESTOR_DOCS_ACCESS_KEY_ID: "fake-access-key-id",
      INVESTOR_DOCS_SECRET_ACCESS_KEY: "fake-secret",
    };
    const portal = createInvestorsPortal({ env: { ...ENV, ...s3Env }, deps: { logger, createDb: () => db, ...fakeAuthDeps() } });
    await portal.start();
    app = express().use("/api/investors", portal.apiRouter);
    const doc = await createDoc();
    const res = await api("post", `/admin/documents/${doc.id}/upload-url`).send(DECK);
    expect(res.status).toBe(200);
    const url = new URL(res.body.url);
    expect(url.hostname).toMatch(/^example-investor-docs\.s3\.eu-west-2\.amazonaws\.com$/);
    expect(url.pathname).toBe(`/${res.body.key}`);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(logger.warn.mock.calls.flat().join(" ")).not.toContain("X-Amz");
    expect(logger.error).not.toHaveBeenCalled();
  });
});
