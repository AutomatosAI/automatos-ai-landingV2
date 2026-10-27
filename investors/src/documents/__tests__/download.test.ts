import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/errors";
import { setTokenSource } from "@/auth/token";
import { investorDocument } from "@/test/fixtures";

import { fetchDocuments, requestDocumentLink } from "../documents-api";
import { downloadDocument } from "../download";

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const ID = "00000000-0000-4000-8000-0000000000d1";
const SIGNED = "https://storage.example.com/documents/d1/v1/example-deck.pdf?X-Amz-Signature=abc";

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setTokenSource(async () => "tok_ada");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setTokenSource(null);
});

describe("downloadDocument", () => {
  it("asks for a download link with the token, then goes to it", async () => {
    fetchMock.mockResolvedValue(json(200, { url: SIGNED, expiresIn: 300 }));
    const go = vi.fn();
    await downloadDocument(ID, go);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`/api/investors/documents/${ID}/link`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ mode: "download" });
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer tok_ada");
    expect(go).toHaveBeenCalledWith(SIGNED);
  });

  it("goes nowhere when the server refuses", async () => {
    fetchMock.mockResolvedValue(json(429, { error: "rate_limited" }));
    const go = vi.fn();
    await expect(downloadDocument(ID, go)).rejects.toMatchObject({ kind: "rate_limited" });
    expect(go).not.toHaveBeenCalled();
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "/relative/path"])("never goes to a link like %s", async (link) => {
    fetchMock.mockResolvedValue(json(200, { url: link, expiresIn: 300 }));
    const go = vi.fn();
    await expect(downloadDocument(ID, go)).rejects.toBeInstanceOf(ApiError);
    expect(go).not.toHaveBeenCalled();
  });
});

describe("the documents API", () => {
  it("asks for an inline link to open a document", async () => {
    fetchMock.mockResolvedValue(json(200, { url: SIGNED, expiresIn: 300 }));
    await expect(requestDocumentLink(ID, "inline")).resolves.toEqual({ url: SIGNED, expiresIn: 300 });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ mode: "inline" });
  });

  it("reads the list and drops fields it does not know", async () => {
    const deck = investorDocument();
    fetchMock.mockResolvedValue(json(200, { documents: [{ ...deck, s3Key: "documents/x" }] }));
    await expect(fetchDocuments()).resolves.toEqual([deck]);
  });

  it("refuses a list it cannot read", async () => {
    fetchMock.mockResolvedValue(json(200, { documents: [{ ...investorDocument(), kind: "image" }] }));
    await expect(fetchDocuments()).rejects.toMatchObject({ kind: "bad_response" });
  });
});
