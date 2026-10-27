import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/errors";
import { adminDocument } from "@/test/fixtures";

import { UploadStepError, uploadDocumentFile, uploadFailureReason, type UploadSteps } from "../upload-file";
import { IDLE, uploadReducer, type UploadEvent, type UploadState } from "../upload-machine";
import { PutError } from "../xhr-put";

const DOC_ID = "00000000-0000-4000-8000-0000000000d1";
const TARGET = {
  url: "https://storage.example.com/signed",
  key: `documents/${DOC_ID}/v2/deck.pdf`,
  headers: { "Content-Type": "application/pdf" },
};

const pdf = (size = 2048) => new File([new Uint8Array(size)], "deck.pdf", { type: "application/pdf" });
const csv = () => new File(["a,b\n1,2\n"], "metrics.csv", { type: "application/vnd.ms-excel" });

function fakeSteps(overrides: Partial<UploadSteps> = {}): UploadSteps {
  return {
    countPages: vi.fn(async () => 12),
    requestUploadUrl: vi.fn(async () => TARGET),
    put: vi.fn(async ({ onProgress }) => {
      onProgress?.(512, 2048);
      onProgress?.(2048, 2048);
    }),
    finalize: vi.fn(async () => adminDocument({ version: 2 })),
    ...overrides,
  };
}

/** Runs one upload; returns what it resolved with, the events and the machine's last state. */
async function upload(file: File, steps: UploadSteps, controller = new AbortController()) {
  const events: UploadEvent[] = [];
  const result = await uploadDocumentFile(
    { documentId: DOC_ID, file, dispatch: (event) => events.push(event), signal: controller.signal },
    steps,
  );
  const state = events.reduce<UploadState>(uploadReducer, IDLE);
  return { result, events, state };
}

describe("uploadDocumentFile", () => {
  it("measures a PDF's pages and sends the count to upload-url and finalize", async () => {
    const steps = fakeSteps();
    const file = pdf();
    const { result, events, state } = await upload(file, steps);
    expect(steps.countPages).toHaveBeenCalledWith(file);
    expect(steps.requestUploadUrl).toHaveBeenCalledWith(
      DOC_ID,
      { fileName: "deck.pdf", contentType: "application/pdf", contentLength: 2048, pageCount: 12 },
      expect.any(AbortSignal),
    );
    expect(steps.put).toHaveBeenCalledWith(
      expect.objectContaining({ url: TARGET.url, headers: TARGET.headers, body: file }),
    );
    expect(steps.finalize).toHaveBeenCalledWith(DOC_ID, { key: TARGET.key, pageCount: 12 }, expect.any(AbortSignal));
    expect(events.map((event) => event.type)).toEqual(["start", "progress", "progress", "uploaded", "finalized"]);
    expect(state).toEqual({ phase: "done", version: 2 });
    expect(result?.version).toBe(2);
  });

  it("signs a non-PDF with its extension's type and no page count", async () => {
    const steps = fakeSteps();
    await upload(csv(), steps);
    expect(steps.countPages).not.toHaveBeenCalled();
    expect(steps.requestUploadUrl).toHaveBeenCalledWith(
      DOC_ID,
      expect.objectContaining({ contentType: "text/csv", pageCount: null }),
      expect.any(AbortSignal),
    );
    expect(steps.finalize).toHaveBeenCalledWith(DOC_ID, { key: TARGET.key, pageCount: null }, expect.any(AbortSignal));
  });

  it("refuses a file outside KP11 before asking the server", async () => {
    const steps = fakeSteps();
    const { result, state } = await upload(new File(["x"], "photo.png", { type: "image/png" }), steps);
    expect(result).toBeNull();
    expect(state).toEqual({ phase: "error", reason: "content_type_not_allowed" });
    expect(steps.requestUploadUrl).not.toHaveBeenCalled();
  });

  it.each<[string, Partial<UploadSteps>, string]>([
    ["an unreadable PDF", { countPages: vi.fn(async () => Promise.reject(new Error("bad xref"))) }, "unreadable_pdf"],
    ["a PDF over 2000 pages", { countPages: vi.fn(async () => 2001) }, "too_many_pages"],
    ["an expired PUT", { put: vi.fn(async () => Promise.reject(new PutError({ status: 403 }))) }, "expired"],
    ["a dropped connection", { put: vi.fn(async () => Promise.reject(new PutError({}))) }, "network"],
    [
      "a stale finalize",
      { finalize: vi.fn(async () => Promise.reject(new ApiError({ kind: "server", status: 409, code: "stale_upload" }))) },
      "stale_upload",
    ],
  ])("ends in error for %s", async (_name, overrides, reason) => {
    const { result, state } = await upload(pdf(), fakeSteps(overrides));
    expect(result).toBeNull();
    expect(state).toEqual({ phase: "error", reason });
  });

  it("reports nothing more once abandoned", async () => {
    const controller = new AbortController();
    const steps = fakeSteps({
      put: vi.fn(async () => {
        controller.abort();
        throw new PutError({ aborted: true });
      }),
    });
    const { result, events } = await upload(pdf(), steps, controller);
    expect(result).toBeNull();
    expect(events.map((event) => event.type)).toEqual(["start"]);
    expect(steps.finalize).not.toHaveBeenCalled();
  });
});

describe("uploadFailureReason", () => {
  it.each<[unknown, string]>([
    [new UploadStepError("too_many_pages"), "too_many_pages"],
    [new PutError({ status: 403 }), "expired"],
    [new PutError({ status: 500 }), "failed"],
    [new PutError({}), "network"],
    [new ApiError({ kind: "invalid", status: 400, code: "file_too_large" }), "file_too_large"],
    [new ApiError({ kind: "invalid", status: 400, code: "content_type_not_allowed" }), "content_type_not_allowed"],
    [new ApiError({ kind: "server", status: 409, code: "not_uploaded" }), "not_uploaded"],
    [new ApiError({ kind: "unavailable", status: 503, code: "storage_unavailable" }), "storage_unavailable"],
    [new ApiError({ kind: "unavailable", status: 503, code: "portal_unavailable" }), "storage_unavailable"],
    [new ApiError({ kind: "network" }), "network"],
    [new ApiError({ kind: "invalid", status: 400, code: "invalid" }), "failed"],
    [new ApiError({ kind: "server", status: 409, code: "toString" }), "failed"],
    [new Error("boom"), "failed"],
  ])("maps %o to %s", (error, reason) => {
    expect(uploadFailureReason(error)).toBe(reason);
  });
});
