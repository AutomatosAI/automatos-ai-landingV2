import { documentPath } from "@/lib/paths";

/**
 * /documents/:id?present=1 opens the viewer in present mode (W3-02), in the
 * overlay: a browser grants true full screen only after a gesture, so the
 * overlay offers a Full screen button. Leaving present mode drops the
 * parameter, so a reload reads the document normally.
 */
export const PRESENT_PARAM = "present";
const PRESENT_ON = "1";

/** The viewer of a document, starting in present mode. */
export function presentPath(documentId: string): string {
  return `${documentPath(documentId)}?${PRESENT_PARAM}=${PRESENT_ON}`;
}

export function isPresentRequested(params: URLSearchParams): boolean {
  return params.get(PRESENT_PARAM) === PRESENT_ON;
}

/** The same search parameters without present mode's (a copy: the input is left as it was). */
export function withoutPresent(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(PRESENT_PARAM);
  return next;
}
