import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/errors";
import { strings } from "@/strings";

import { changeFailureMessage, listFailureMessage, uploadPercent, uploadStatusText } from "../messages";
import type { UploadErrorReason, UploadState } from "../upload-machine";

const admin = strings.admin;

describe("listFailureMessage", () => {
  it("says storage is not set up for the S3 503", () => {
    const error = new ApiError({ kind: "unavailable", status: 503, code: "storage_unavailable" });
    expect(listFailureMessage(error)).toBe(admin.documents.storageUnavailable);
  });

  it("says not available to a signed-in non-admin, and sign in again on a 401", () => {
    expect(listFailureMessage(new ApiError({ kind: "forbidden", status: 403, code: "forbidden" }))).toBe(
      strings.status.notAvailable.body,
    );
    expect(listFailureMessage(new ApiError({ kind: "unauthenticated", status: 401 }))).toBe(strings.status.signIn.body);
  });

  it("falls back to the general message", () => {
    expect(listFailureMessage(new ApiError({ kind: "server", status: 500 }))).toBe(strings.status.error.body);
    expect(listFailureMessage(new Error("boom"))).toBe(strings.status.error.body);
  });
});

describe("changeFailureMessage", () => {
  it("asks for a file before publishing on 409 no_file", () => {
    expect(changeFailureMessage(new ApiError({ kind: "server", status: 409, code: "no_file" }))).toBe(
      admin.documents.publishNeedsFile,
    );
  });

  it("falls back to the general change message", () => {
    expect(changeFailureMessage(new ApiError({ kind: "network" }))).toBe(admin.documents.changeFailed);
  });
});

describe("uploadStatusText and uploadPercent", () => {
  it.each<[UploadState, string, number | null]>([
    [{ phase: "idle" }, "", null],
    [{ phase: "requesting" }, admin.upload.requesting, 0],
    [{ phase: "uploading", percent: 42 }, "Uploading… 42%", 42],
    [{ phase: "finalizing" }, admin.upload.finalizing, 100],
    [{ phase: "done", version: 3 }, "Uploaded as version 3.", null],
  ])("words %o", (state, text, percent) => {
    expect(uploadStatusText(state)).toBe(text);
    expect(uploadPercent(state)).toBe(percent);
  });

  it("words every error reason", () => {
    const reasons = Object.keys(admin.upload.errors) as UploadErrorReason[];
    expect(reasons).toHaveLength(11);
    reasons.forEach((reason) => {
      expect(uploadStatusText({ phase: "error", reason })).toBe(admin.upload.errors[reason]);
    });
  });
});
