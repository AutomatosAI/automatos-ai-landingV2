import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readPortalConfig } from "../config.js";
import {
  ALLOWED_CONTENT_TYPES,
  GET_EXPIRES_SEC,
  MAX_FILE_NAME_LENGTH,
  MAX_UPLOAD_BYTES,
  PUT_EXPIRES_SEC,
  UploadRejectedError,
  checkUpload,
  contentDisposition,
  createDocStore,
  documentKey,
  safeFileName,
} from "../s3.js";

// Invented values: presigning is local maths over these, nothing is sent.
const CONFIG = readPortalConfig({
  INVESTOR_DOCS_BUCKET: "example-investor-docs",
  INVESTOR_DOCS_REGION: "eu-west-2",
  INVESTOR_DOCS_ACCESS_KEY_ID: "fake-access-key-id",
  INVESTOR_DOCS_SECRET_ACCESS_KEY: "fake-secret",
}).s3;

const DOC_ID = "0b6d7c2e-4f1a-4c3b-9e8d-1a2b3c4d5e6f";
const KEY = documentKey(DOC_ID, 1, "Deck.pdf");
const PDF = Object.freeze({ key: KEY, contentType: "application/pdf", contentLength: 18_432 });
const SIGNING_TIME = new Date("2026-10-27T10:00:00Z");

/** @param {string} url */
const paramsOf = (url) => new URL(url).searchParams;

/** Only Date is faked: the signature depends on the signing time, nothing else here waits. */
function freezeClock() {
  vi.useFakeTimers({ toFake: ["Date"], now: SIGNING_TIME });
}

/** @param {(command: object) => Promise<Record<string, unknown>>} impl */
function fakeClient(impl) {
  return { send: vi.fn(impl) };
}

/** @param {number} status @param {string} name */
function s3Error(status, name) {
  return Object.assign(new Error(name), { name, $metadata: { httpStatusCode: status } });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("safeFileName", () => {
  it("keeps the last path segment only", () => {
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("C:\\fakepath\\Deck.pdf")).toBe("Deck.pdf");
    expect(safeFileName("/tmp/a/b/Report.xlsx")).toBe("Report.xlsx");
  });

  it("turns runs of odd characters into one dash and folds accents", () => {
    expect(safeFileName("Q3 report (final)!.pdf")).toBe("Q3-report-final.pdf");
    expect(safeFileName("Café   Übersicht.docx")).toBe("Cafe-Ubersicht.docx");
    expect(safeFileName("a\r\nb\u0000c\"d'e.csv")).toBe("a-b-c-d-e.csv");
    expect(safeFileName("..hidden..")).toBe("hidden");
  });

  it("only ever returns [A-Za-z0-9._-], never empty, never a dot or dash first", () => {
    const names = ["", null, undefined, "...", "报告.pdf", ".env", "-rf", "💾💾.mp4", "x".repeat(500)];
    const results = names.map(safeFileName);
    expect(results.slice(0, 6)).toEqual(["file", "file", "file", "file", "file.pdf", "file.env"]);
    expect(results.at(6)).toBe("rf");
    expect(results.at(7)).toBe("file.mp4");
    results.forEach((result) => expect(result).toMatch(/^[A-Za-z0-9_][A-Za-z0-9._-]{0,119}$/));
  });

  it(`caps at ${MAX_FILE_NAME_LENGTH} characters and keeps the extension`, () => {
    const long = safeFileName(`${"a".repeat(300)}.pdf`);
    expect(long).toHaveLength(MAX_FILE_NAME_LENGTH);
    expect(long.endsWith("aaaa.pdf")).toBe(true);
    expect(safeFileName(`${"b".repeat(200)}`)).toHaveLength(MAX_FILE_NAME_LENGTH);
    expect(safeFileName(`${"c".repeat(115)}-----x.pdf`)).toBe(`${"c".repeat(115)}.pdf`);
  });
});

describe("documentKey", () => {
  it("builds documents/<id>/v<version>/<safe name>", () => {
    expect(documentKey(DOC_ID, 3, "My Deck (v3).pdf")).toBe(`documents/${DOC_ID}/v3/My-Deck-v3.pdf`);
  });

  it("refuses an id or version that would escape the key layout", () => {
    expect(() => documentKey("../other", 1, "a.pdf")).toThrow(TypeError);
    expect(() => documentKey("", 1, "a.pdf")).toThrow(TypeError);
    expect(() => documentKey(DOC_ID, 0, "a.pdf")).toThrow(TypeError);
    expect(() => documentKey(DOC_ID, 1.5, "a.pdf")).toThrow(TypeError);
    expect(() => documentKey(DOC_ID, "2", "a.pdf")).toThrow(TypeError);
  });
});

describe("checkUpload (KP11 limits)", () => {
  it("accepts exactly KP11's six content types up to 250 MB", () => {
    expect(ALLOWED_CONTENT_TYPES).toHaveLength(6);
    expect(MAX_UPLOAD_BYTES).toBe(262_144_000);
    ALLOWED_CONTENT_TYPES.forEach((contentType) => {
      expect(checkUpload({ contentType, contentLength: MAX_UPLOAD_BYTES })).toEqual({
        contentType,
        contentLength: MAX_UPLOAD_BYTES,
      });
    });
  });

  it.each(["text/html", "image/svg+xml", "application/octet-stream", "APPLICATION/PDF", "application/pdf; x=1", "", 7])(
    "rejects content type %j",
    (contentType) => {
      const attempt = () => checkUpload({ contentType, contentLength: 100 });
      expect(attempt).toThrow(UploadRejectedError);
      expect(attempt).toThrow(expect.objectContaining({ code: "content_type_not_allowed", status: 400 }));
    },
  );

  it("rejects a file over 250 MB as file_too_large", () => {
    expect(() => checkUpload({ contentType: "video/mp4", contentLength: MAX_UPLOAD_BYTES + 1 })).toThrow(
      expect.objectContaining({ name: "UploadRejectedError", code: "file_too_large", status: 400 }),
    );
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "100", null])("rejects size %j as invalid_size", (size) => {
    expect(() => checkUpload({ contentType: "text/csv", contentLength: size })).toThrow(
      expect.objectContaining({ code: "invalid_size" }),
    );
  });
});

describe("contentDisposition", () => {
  it("gives an ASCII filename and an RFC 5987 filename*", () => {
    expect(contentDisposition("inline", "Café deck (v2)'s.pdf")).toBe(
      "inline; filename=\"Cafe-deck-v2-s.pdf\"; filename*=UTF-8''Caf%C3%A9%20deck%20%28v2%29%27s.pdf",
    );
    expect(contentDisposition("attachment", "Model.xlsx")).toBe(
      "attachment; filename=\"Model.xlsx\"; filename*=UTF-8''Model.xlsx",
    );
  });

  it("never lets a name break out of the header", () => {
    const header = contentDisposition("attachment", 'a"b\r\nSet-Cookie: x=1;.pdf');
    expect(header).not.toMatch(/[\r\n]/);
    expect(header.split('"')).toHaveLength(3);
    expect(header).toBe(
      "attachment; filename=\"a-b-Set-Cookie-x-1.pdf\"; filename*=UTF-8''a%22b%20Set-Cookie%3A%20x%3D1%3B.pdf",
    );
    expect(contentDisposition("inline", "C:\\fakepath\\Deck.pdf")).toBe(
      "inline; filename=\"Deck.pdf\"; filename*=UTF-8''Deck.pdf",
    );
  });

  it("falls back to a safe name when nothing printable is left", () => {
    expect(contentDisposition("inline", "\u0000\u0001")).toBe("inline; filename=\"file\"; filename*=UTF-8''file");
    expect(contentDisposition("inline", "\ud800.pdf")).toMatch(/filename\*=UTF-8''%EF%BF%BD\.pdf$/);
  });

  it("refuses any disposition but inline or attachment", () => {
    expect(() => contentDisposition("form-data", "a.pdf")).toThrow(TypeError);
  });
});

describe("createDocStore", () => {
  it("needs the S3 config", () => {
    expect(() => createDocStore({ config: null })).toThrow(TypeError);
    expect(() => createDocStore({ config: readPortalConfig({}).s3 })).toThrow(TypeError);
  });
});

describe("presignPut (real signing, fake credentials, offline)", () => {
  it("signs a PUT for the key that expires in 900 s and binds the content type and size", async () => {
    freezeClock();
    const upload = await createDocStore({ config: CONFIG }).presignPut(PDF);
    const url = new URL(upload.url);
    expect(url.hostname).toBe("example-investor-docs.s3.eu-west-2.amazonaws.com");
    expect(url.pathname).toBe(`/${KEY}`);
    expect(PUT_EXPIRES_SEC).toBe(900);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(url.searchParams.get("X-Amz-Date")).toBe("20261027T100000Z");
    expect(url.searchParams.get("X-Amz-SignedHeaders")?.split(";")).toEqual(["content-length", "content-type", "host"]);
    expect(url.searchParams.get("x-id")).toBe("PutObject");
    expect(upload.headers).toEqual({ "Content-Type": "application/pdf" });
    expect(upload.expiresAt).toBe("2026-10-27T10:15:00.000Z");
    expect(Object.isFrozen(upload)).toBe(true);
  });

  it("carries no checksum of an empty body (S3 would hold the upload to it)", async () => {
    const { url } = await createDocStore({ config: CONFIG }).presignPut(PDF);
    expect([...paramsOf(url).keys()].filter((name) => name.toLowerCase().includes("checksum"))).toEqual([]);
  });

  it("signs a different URL for a different content type or size, the same for the same", async () => {
    freezeClock();
    const store = createDocStore({ config: CONFIG });
    const signatureOf = async (upload) => paramsOf((await store.presignPut(upload)).url).get("X-Amz-Signature");
    const base = await signatureOf(PDF);
    expect(await signatureOf(PDF)).toBe(base);
    expect(await signatureOf({ ...PDF, contentType: "video/mp4" })).not.toBe(base);
    expect(await signatureOf({ ...PDF, contentLength: PDF.contentLength + 1 })).not.toBe(base);
  });

  it("rejects a disallowed type or an oversize file before signing", async () => {
    const store = createDocStore({ config: CONFIG });
    await expect(store.presignPut({ ...PDF, contentType: "text/html" })).rejects.toMatchObject({
      code: "content_type_not_allowed",
    });
    await expect(store.presignPut({ ...PDF, contentLength: MAX_UPLOAD_BYTES + 1 })).rejects.toBeInstanceOf(
      UploadRejectedError,
    );
  });

  it("refuses a key outside documents/<id>/v<n>/", async () => {
    const store = createDocStore({ config: CONFIG });
    await expect(store.presignPut({ ...PDF, key: "site/index.html" })).rejects.toThrow(TypeError);
    await expect(store.presignPut({ ...PDF, key: `documents/${DOC_ID}/v1/../x.pdf` })).rejects.toThrow(TypeError);
  });
});

describe("presignGet (real signing, fake credentials, offline)", () => {
  it("signs a GET that expires in 300 s with an inline disposition", async () => {
    freezeClock();
    const read = await createDocStore({ config: CONFIG }).presignGet({ key: KEY, fileName: "Deck.pdf", disposition: "inline" });
    const params = paramsOf(read.url);
    expect(GET_EXPIRES_SEC).toBe(300);
    expect(params.get("X-Amz-Expires")).toBe("300");
    expect(params.get("X-Amz-SignedHeaders")).toBe("host");
    expect(params.get("response-content-disposition")).toBe("inline; filename=\"Deck.pdf\"; filename*=UTF-8''Deck.pdf");
    expect(read.expiresAt).toBe("2026-10-27T10:05:00.000Z");
  });

  it("carries an attachment disposition with the real name as an RFC 5987 filename*", async () => {
    const store = createDocStore({ config: CONFIG });
    const read = await store.presignGet({ key: KEY, fileName: "Prévisions 2027.xlsx", disposition: "attachment" });
    expect(paramsOf(read.url).get("response-content-disposition")).toBe(
      "attachment; filename=\"Previsions-2027.xlsx\"; filename*=UTF-8''Pr%C3%A9visions%202027.xlsx",
    );
    expect(paramsOf(read.url).has("x-amz-checksum-mode")).toBe(false);
  });

  it("refuses an unknown disposition or a foreign key", async () => {
    const store = createDocStore({ config: CONFIG });
    await expect(store.presignGet({ key: KEY, fileName: "a.pdf", disposition: "download" })).rejects.toThrow(TypeError);
    await expect(store.presignGet({ key: "../a.pdf", fileName: "a.pdf", disposition: "inline" })).rejects.toThrow(TypeError);
  });

  it("never logs, so a presigned URL never reaches the logs", async () => {
    const spies = ["log", "info", "warn", "error", "debug"].map((method) => vi.spyOn(console, method));
    const store = createDocStore({ config: CONFIG });
    await store.presignPut(PDF);
    await store.presignGet({ key: KEY, fileName: "Deck.pdf", disposition: "attachment" });
    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});

describe("head and remove (injected client)", () => {
  it("head sends HeadObject for the key and returns the size and type", async () => {
    const client = fakeClient(async () => ({ ContentLength: 18_432, ContentType: "application/pdf", ETag: '"x"' }));
    const found = await createDocStore({ config: CONFIG, client }).head(KEY);
    expect(found).toEqual({ size: 18_432, contentType: "application/pdf" });
    expect(Object.isFrozen(found)).toBe(true);
    const [command] = client.send.mock.calls[0];
    expect(command).toBeInstanceOf(HeadObjectCommand);
    expect(command.input).toEqual({ Bucket: "example-investor-docs", Key: KEY });
  });

  it("head answers null for a missing object", async () => {
    const notFound = fakeClient(async () => Promise.reject(s3Error(404, "NotFound")));
    expect(await createDocStore({ config: CONFIG, client: notFound }).head(KEY)).toBeNull();
    const noSuchKey = fakeClient(async () => Promise.reject(s3Error(404, "NoSuchKey")));
    expect(await createDocStore({ config: CONFIG, client: noSuchKey }).head(KEY)).toBeNull();
  });

  it("head rethrows anything else (a 403 means the bucket grant is wrong)", async () => {
    const denied = fakeClient(async () => Promise.reject(s3Error(403, "Forbidden")));
    await expect(createDocStore({ config: CONFIG, client: denied }).head(KEY)).rejects.toMatchObject({ name: "Forbidden" });
  });

  it("remove sends DeleteObject for the key", async () => {
    const client = fakeClient(async () => ({}));
    await expect(createDocStore({ config: CONFIG, client }).remove(KEY)).resolves.toBeUndefined();
    const [command] = client.send.mock.calls[0];
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({ Bucket: "example-investor-docs", Key: KEY });
  });

  it("head and remove never send for a key outside documents/", async () => {
    const client = fakeClient(async () => ({}));
    const store = createDocStore({ config: CONFIG, client });
    await expect(store.remove("")).rejects.toThrow(TypeError);
    await expect(store.remove("documents/")).rejects.toThrow(TypeError);
    await expect(store.head("investors/other.csv")).rejects.toThrow(TypeError);
    expect(client.send).not.toHaveBeenCalled();
  });
});
