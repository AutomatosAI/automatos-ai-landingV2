import { ApiError } from "@/api/errors";
import { strings } from "@/strings";

import type { UploadState } from "./upload-machine";

/** The words the document manager shows for each outcome: plain messages, never the server's codes. */

const copy = strings.admin;

/** Under the heading when the list cannot be read. */
export function listFailureMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return strings.status.error.body;
  if (error.code === "storage_unavailable") return copy.documents.storageUnavailable;
  if (error.kind === "forbidden") return strings.status.notAvailable.body;
  if (error.kind === "unauthenticated") return strings.status.signIn.body;
  return strings.status.error.body;
}

/** Under a row when a switch or a preview fails. */
export function changeFailureMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "no_file") return copy.documents.publishNeedsFile;
  if (error instanceof ApiError && error.kind === "unauthenticated") return strings.status.signIn.body;
  return copy.documents.changeFailed;
}

/** The line beside a row's progress bar; empty while idle. */
export function uploadStatusText(state: UploadState): string {
  const upload = copy.upload;
  switch (state.phase) {
    case "idle":
      return "";
    case "requesting":
      return upload.requesting;
    case "uploading":
      return upload.uploading(state.percent);
    case "finalizing":
      return upload.finalizing;
    case "done":
      return upload.done(state.version);
    case "error":
      return upload.errors[state.reason];
  }
}

/** How full the bar is: the PUT's percent, full once the file is in storage. */
export function uploadPercent(state: UploadState): number | null {
  if (state.phase === "requesting") return 0;
  if (state.phase === "uploading") return state.percent;
  if (state.phase === "finalizing") return 100;
  return null;
}
