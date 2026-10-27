/**
 * One file's upload as a pure state machine:
 * idle → requesting → uploading(percent) → finalizing → done | error.
 * "requesting" covers the browser's checks (type, size, a PDF's page count)
 * and the presigned PUT request; "uploading" is the PUT itself; "finalizing"
 * is the server's HEAD and record. An event that does not fit the state is
 * ignored, so a late event from an abandoned upload changes nothing.
 */

import type { FileRejection } from "./file-types";

export type UploadErrorReason =
  | FileRejection
  | "unreadable_pdf"
  | "too_many_pages"
  | "stale_upload"
  | "not_uploaded"
  | "storage_unavailable"
  | "expired"
  | "network"
  | "failed";

export type UploadState =
  | { readonly phase: "idle" }
  | { readonly phase: "requesting" }
  | { readonly phase: "uploading"; readonly percent: number }
  | { readonly phase: "finalizing" }
  | { readonly phase: "done"; readonly version: number }
  | { readonly phase: "error"; readonly reason: UploadErrorReason };

export type UploadEvent =
  | { readonly type: "start" }
  | { readonly type: "progress"; readonly loaded: number; readonly total: number }
  | { readonly type: "uploaded" }
  | { readonly type: "finalized"; readonly version: number }
  | { readonly type: "fail"; readonly reason: UploadErrorReason }
  | { readonly type: "reset" };

export const IDLE: UploadState = Object.freeze({ phase: "idle" });

/** While true, a new file must wait (and the row's other file actions with it). */
export function isBusy(state: UploadState): boolean {
  return state.phase === "requesting" || state.phase === "uploading" || state.phase === "finalizing";
}

/** Whole percent, 0..100; 0 while the total is unknown. */
export function percentOf(loaded: number, total: number): number {
  if (!Number.isFinite(loaded) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((loaded / total) * 100)));
}

function onProgress(state: UploadState, loaded: number, total: number): UploadState {
  if (state.phase !== "requesting" && state.phase !== "uploading") return state;
  const before = state.phase === "uploading" ? state.percent : 0;
  // Never backwards: a retried chunk must not make the bar jump back.
  return { phase: "uploading", percent: Math.max(before, percentOf(loaded, total)) };
}

export function uploadReducer(state: UploadState, event: UploadEvent): UploadState {
  switch (event.type) {
    case "start":
      return isBusy(state) ? state : { phase: "requesting" };
    case "progress":
      return onProgress(state, event.loaded, event.total);
    case "uploaded":
      // A small file can finish before any progress event: requesting is fine too.
      return state.phase === "requesting" || state.phase === "uploading" ? { phase: "finalizing" } : state;
    case "finalized":
      return state.phase === "finalizing" ? { phase: "done", version: event.version } : state;
    case "fail":
      return isBusy(state) ? { phase: "error", reason: event.reason } : state;
    case "reset":
      return IDLE;
  }
}
