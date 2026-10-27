import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/errors";

import { afterLoadError, FIRST_CYCLE, isExpiredLink, LINK_RENEWALS, retryCycle, viewerPhase } from "../link-model";

/** What pdf.js hands react-pdf's onLoadError for a refused storage GET (pdfjs-dist 4.8.69). */
function storageRefused(status: number) {
  return Object.assign(new Error(`Unexpected server response (${status}) while retrieving PDF.`), {
    name: "UnexpectedResponseException",
    status,
  });
}

const missing = Object.assign(new Error("Missing PDF."), { name: "MissingPDFException" });
const corrupt = Object.assign(new Error("Invalid PDF structure."), { name: "InvalidPDFException" });

describe("isExpiredLink", () => {
  it("is a 403 from storage, as pdf.js reports it", () => {
    expect(isExpiredLink(storageRefused(403))).toBe(true);
  });

  it("is nothing else", () => {
    expect(isExpiredLink(storageRefused(500))).toBe(false);
    expect(isExpiredLink(storageRefused(404))).toBe(false);
    expect(isExpiredLink(missing)).toBe(false);
    expect(isExpiredLink(corrupt)).toBe(false);
    expect(isExpiredLink(new ApiError({ kind: "forbidden", status: 403 }))).toBe(false);
    expect(isExpiredLink({ name: "UnexpectedResponseException", status: "403" })).toBe(false);
    expect(isExpiredLink(null)).toBe(false);
    expect(isExpiredLink("403")).toBe(false);
  });
});

describe("afterLoadError", () => {
  it("renews an expired link once, with a new generation", () => {
    const renewed = afterLoadError(FIRST_CYCLE, storageRefused(403));
    expect(renewed).toEqual({ generation: 1, renewals: 1, loadError: null });
    expect(LINK_RENEWALS).toBe(1);
  });

  it("stops with the error when the renewed link is refused too", () => {
    const error = storageRefused(403);
    const renewed = afterLoadError(FIRST_CYCLE, storageRefused(403));
    expect(afterLoadError(renewed, error)).toEqual({ generation: 1, renewals: 1, loadError: error });
  });

  it("never renews for any other failure", () => {
    expect(afterLoadError(FIRST_CYCLE, corrupt)).toEqual({ ...FIRST_CYCLE, loadError: corrupt });
    expect(afterLoadError(FIRST_CYCLE, storageRefused(500)).generation).toBe(0);
  });

  it("keeps an error even when pdf.js gives none", () => {
    expect(afterLoadError(FIRST_CYCLE, undefined).loadError).toBeInstanceOf(Error);
  });

  it("does not change the cycle it is given", () => {
    const cycle = Object.freeze({ ...FIRST_CYCLE });
    afterLoadError(cycle, storageRefused(403));
    expect(cycle).toEqual(FIRST_CYCLE);
  });
});

describe("retryCycle", () => {
  it("asks for a new link with a fresh renewal", () => {
    const spent = afterLoadError(afterLoadError(FIRST_CYCLE, storageRefused(403)), storageRefused(403));
    const retried = retryCycle(spent);
    expect(retried).toEqual({ generation: 2, renewals: 0, loadError: null });
    expect(afterLoadError(retried, storageRefused(403))).toEqual({ generation: 3, renewals: 1, loadError: null });
  });
});

describe("viewerPhase", () => {
  const url = "https://storage.example.com/signed-get";

  it("follows the link request", () => {
    expect(viewerPhase(FIRST_CYCLE, { status: "pending" })).toEqual({ kind: "linking" });
    const error = new ApiError({ kind: "rate_limited", status: 429 });
    expect(viewerPhase(FIRST_CYCLE, { status: "error", error })).toEqual({ kind: "link_failed", error });
    expect(viewerPhase(FIRST_CYCLE, { status: "success", url })).toEqual({ kind: "ready", url });
  });

  it("shows the load error once no renewal is left", () => {
    const failed = afterLoadError(FIRST_CYCLE, corrupt);
    expect(viewerPhase(failed, { status: "success", url })).toEqual({ kind: "load_failed", error: corrupt });
  });
});
