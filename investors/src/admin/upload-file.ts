import { ApiError } from "@/api/errors";

import {
  finalizeUpload,
  requestUploadUrl,
  type AdminDocument,
  type FinalizeBody,
  type UploadTarget,
  type UploadUrlBody,
} from "./documents-api";
import { PDF_TYPE, checkFile } from "./file-types";
import { MAX_PAGE_COUNT, countPdfPages } from "./page-count";
import type { UploadErrorReason, UploadEvent } from "./upload-machine";
import { PutError, putWithProgress, type PutRequest } from "./xhr-put";

/**
 * Drives one upload through the presigned flow (US-014): check the file,
 * measure a PDF's pages, ask for the presigned PUT, PUT with progress, then
 * finalize. Each step is reported to the state machine (upload-machine.ts).
 */

/** The steps that talk to the outside world; tests pass fakes. */
export interface UploadSteps {
  readonly countPages: (file: File) => Promise<number>;
  readonly requestUploadUrl: (id: string, body: UploadUrlBody, signal?: AbortSignal) => Promise<UploadTarget>;
  readonly put: (request: PutRequest) => Promise<void>;
  readonly finalize: (id: string, body: FinalizeBody, signal?: AbortSignal) => Promise<AdminDocument>;
}

const REAL_STEPS: UploadSteps = {
  countPages: (file) => countPdfPages(file),
  requestUploadUrl,
  put: putWithProgress,
  finalize: finalizeUpload,
};

/** A failure the browser finds itself, before or around the API calls. */
export class UploadStepError extends Error {
  readonly reason: UploadErrorReason;

  constructor(reason: UploadErrorReason) {
    super(`upload: ${reason}`);
    this.name = "UploadStepError";
    this.reason = reason;
  }
}

/** The server's refusals that name a reason the admin can act on. */
const API_REASONS: ReadonlySet<string> = new Set<UploadErrorReason>([
  "content_type_not_allowed",
  "invalid_size",
  "file_too_large",
  "stale_upload",
  "not_uploaded",
  "storage_unavailable",
]);

/** Which message the row shows for a failed upload. */
export function uploadFailureReason(error: unknown): UploadErrorReason {
  if (error instanceof UploadStepError) return error.reason;
  if (error instanceof PutError) {
    // A presigned PUT answers 403 once it has expired.
    if (error.status === 403) return "expired";
    return error.status === null ? "network" : "failed";
  }
  if (error instanceof ApiError) {
    if (error.code !== null && API_REASONS.has(error.code)) return error.code as UploadErrorReason;
    if (error.kind === "unavailable") return "storage_unavailable";
    if (error.kind === "network") return "network";
  }
  return "failed";
}

async function measurePages(file: File, steps: UploadSteps): Promise<number> {
  let pages: number;
  try {
    pages = await steps.countPages(file);
  } catch {
    throw new UploadStepError("unreadable_pdf");
  }
  if (!Number.isSafeInteger(pages) || pages < 1) throw new UploadStepError("unreadable_pdf");
  if (pages > MAX_PAGE_COUNT) throw new UploadStepError("too_many_pages");
  return pages;
}

export interface UploadJob {
  readonly documentId: string;
  readonly file: File;
  readonly dispatch: (event: UploadEvent) => void;
  readonly signal: AbortSignal;
}

async function runSteps({ documentId, file, dispatch, signal }: UploadJob, steps: UploadSteps): Promise<AdminDocument> {
  const checked = checkFile(file);
  if (!checked.ok) throw new UploadStepError(checked.reason);
  const { contentType } = checked;
  const pageCount = contentType === PDF_TYPE ? await measurePages(file, steps) : null;
  const body = { fileName: file.name, contentType, contentLength: file.size, pageCount };
  const target = await steps.requestUploadUrl(documentId, body, signal);
  const onProgress = (loaded: number, total: number) => dispatch({ type: "progress", loaded, total });
  await steps.put({ url: target.url, headers: target.headers, body: file, onProgress, signal });
  dispatch({ type: "uploaded" });
  return steps.finalize(documentId, { key: target.key, pageCount }, signal);
}

/**
 * Resolves with the finalized document, or null when the upload failed (the
 * machine holds the reason) or was abandoned (signal aborted: nothing more is
 * reported).
 */
export async function uploadDocumentFile(job: UploadJob, steps: UploadSteps = REAL_STEPS): Promise<AdminDocument | null> {
  job.dispatch({ type: "start" });
  try {
    const document = await runSteps(job, steps);
    if (job.signal.aborted) return null;
    job.dispatch({ type: "finalized", version: document.version });
    return document;
  } catch (error) {
    if (!job.signal.aborted) job.dispatch({ type: "fail", reason: uploadFailureReason(error) });
    return null;
  }
}
