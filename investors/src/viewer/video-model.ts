/**
 * The video player's pure parts. The player streams the presigned inline
 * link (5 minutes, KP11): the browser fetches the file in ranges as it plays,
 * so a link can expire while the investor watches, and storage refuses the
 * next range with 403. The browser never shows a page the HTTP status of a
 * media request. It reports a refused range as a network error
 * (MEDIA_ERR_NETWORK), and a refused first request as a source it cannot
 * use (MEDIA_ERR_SRC_NOT_SUPPORTED): both read as a refused link, which the
 * page renews (link-model.ts). A decode error is a bad file: never renewed.
 */

/** MediaError codes (HTML standard); jsdom has no MediaError, so they are spelled here. */
export const MEDIA_ERR_NETWORK = 2;
export const MEDIA_ERR_DECODE = 3;
export const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

const REFUSED_CODES: ReadonlySet<number> = new Set([MEDIA_ERR_NETWORK, MEDIA_ERR_SRC_NOT_SUPPORTED]);

/** What the player hands the page when the video element fails. */
export interface MediaFailure {
  readonly name: "MediaFailure";
  /** The element's MediaError code; 0 when it gave none. */
  readonly code: number;
}

export function mediaFailure(code: number | undefined): MediaFailure {
  return { name: "MediaFailure", code: code ?? 0 };
}

/** A failure storage refusing the link can cause (see above). Matched by shape, like pdf.js's. */
export function isRefusedMedia(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { name, code } = error as { readonly name?: unknown; readonly code?: unknown };
  return name === "MediaFailure" && typeof code === "number" && REFUSED_CODES.has(code);
}

/** Where the video picks up on a new link: the time, and whether it was playing. */
export interface ResumePoint {
  readonly time: number;
  readonly playing: boolean;
}

export const START: ResumePoint = Object.freeze({ time: 0, playing: false });

/** The element failed at `at`: the page renews the link and resumes there. */
export interface VideoFailure {
  readonly error: MediaFailure;
  readonly at: ResumePoint;
}

/** The element when it failed: whether its metadata had come in, where it was, and whether the investor was watching. */
export interface ElementAtFailure {
  readonly loaded: boolean;
  readonly time: number;
  readonly playing: boolean;
}

/**
 * Where to pick up after a failure: where the element was once it had
 * loaded. Before that it sits at 0 and never reached the point it was
 * given, so that point still holds (a renewed link refused at once).
 */
export function failurePoint(given: ResumePoint, element: ElementAtFailure): ResumePoint {
  return element.loaded ? { time: element.time, playing: element.playing } : given;
}

/** The time to seek to once the new link's metadata is in: the resume time, inside the video. */
export function resumeTime(point: ResumePoint, duration: number): number {
  const time = Number.isFinite(point.time) ? Math.max(0, point.time) : 0;
  return Number.isFinite(duration) && duration > 0 ? Math.min(time, duration) : time;
}

/** The player's hook for the tracker (US-008): the position moved to `time` of `duration` seconds. */
export type OnVideoProgress = (time: number, duration: number) => void;
