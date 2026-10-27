/**
 * The viewer's storage link, as pure steps. The link is a presigned GET that
 * lives 5 minutes (KP11): the viewer asks for one when it opens, and when
 * pdf.js reports that storage refused it as expired (HTTP 403) it asks for a
 * new one ONCE. A second refusal, or any other failure, shows the error with
 * the Download fallback. "Try again" starts a fresh cycle (one more renewal).
 */

/** An expired link is renewed this many times per cycle. */
export const LINK_RENEWALS = 1;

export interface LinkCycle {
  /** Bumped for every new link; part of the link's query key, so each one is a new request. */
  readonly generation: number;
  /** Renewals used in this cycle. */
  readonly renewals: number;
  /** Why pdf.js could not load the link, once no renewal is left; null otherwise. */
  readonly loadError: unknown;
}

export const FIRST_CYCLE: LinkCycle = { generation: 0, renewals: 0, loadError: null };

/**
 * pdf.js answers a non-2xx storage response with UnexpectedResponseException
 * and its status (pdfjs-dist 4.8.69, shared/util.js); S3 refuses an expired
 * presigned URL with 403. Matched by shape: the class lives in the lazy chunk.
 */
export function isExpiredLink(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { name, status } = error as { readonly name?: unknown; readonly status?: unknown };
  return name === "UnexpectedResponseException" && status === 403;
}

/** pdf.js failed to load the link: renew it once when it expired, else stop with the error. */
export function afterLoadError(cycle: LinkCycle, error: unknown): LinkCycle {
  if (isExpiredLink(error) && cycle.renewals < LINK_RENEWALS) {
    return { generation: cycle.generation + 1, renewals: cycle.renewals + 1, loadError: null };
  }
  return { ...cycle, loadError: error ?? new Error("pdf load failed") };
}

/** The reader asked to try again: a new link and a fresh renewal. */
export function retryCycle(cycle: LinkCycle): LinkCycle {
  return { generation: cycle.generation + 1, renewals: 0, loadError: null };
}

/** What the link request reported (react-query's status, narrowed). */
export type LinkRequest =
  | { readonly status: "pending" }
  | { readonly status: "error"; readonly error: unknown }
  | { readonly status: "success"; readonly url: string };

export type ViewerPhase =
  | { readonly kind: "linking" }
  | { readonly kind: "link_failed"; readonly error: unknown }
  | { readonly kind: "ready"; readonly url: string }
  | { readonly kind: "load_failed"; readonly error: unknown };

/** What the viewer shows for a cycle and its link request. */
export function viewerPhase(cycle: LinkCycle, request: LinkRequest): ViewerPhase {
  if (request.status === "pending") return { kind: "linking" };
  if (request.status === "error") return { kind: "link_failed", error: request.error };
  if (cycle.loadError !== null) return { kind: "load_failed", error: cycle.loadError };
  return { kind: "ready", url: request.url };
}
