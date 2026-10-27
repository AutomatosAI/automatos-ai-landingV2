import { ApiError } from "@/api/errors";
import { strings } from "@/strings";

const errors = strings.library.errors;

/** Under a card when its link cannot be issued: plain words, never the server's code. */
export function linkFailureMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return errors.failed;
  switch (error.kind) {
    case "not_found":
      return errors.gone;
    case "rate_limited":
      return errors.rateLimited;
    case "unavailable":
      return errors.unavailable;
    case "storage_unavailable":
      return strings.documents.unavailable;
    case "unauthenticated":
      return strings.status.signIn.body;
    case "blocked":
      return errors.blocked;
    default:
      return errors.failed;
  }
}

/** A 404 means the document went (unpublished or deleted): the list is read again. */
export function isGone(error: unknown): boolean {
  return error instanceof ApiError && error.kind === "not_found";
}
