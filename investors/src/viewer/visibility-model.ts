/**
 * When a PDF page counts as read (US-010): it was at least 50% visible, in a
 * visible tab, for at least 1000 ms. Pure steps over timestamps; the hook
 * (use-page-visibility.ts) feeds it the shown page, the intersection ratio of
 * the page's frame and the tab's visibility. A visit ends when any of those
 * stops holding, or when the viewer closes; a visit of 1000 ms or more is
 * reported with its length, a shorter one is dropped.
 */

export const MIN_VISIBLE_RATIO = 0.5;
export const MIN_VISIT_MS = 1000;

/** The viewer's hook for the tracker (W1-14): a page was read for `ms` milliseconds. */
export type OnPageVisible = (page: number, ms: number) => void;

export interface PageVisit {
  readonly page: number;
  readonly ms: number;
}

export interface VisibilityState {
  /** The page on screen once rendered; null while none is. */
  readonly page: number | null;
  /** The frame's last intersection ratio with the viewport (0 to 1). */
  readonly ratio: number;
  readonly tabVisible: boolean;
  /** When the current visit started; null while the page does not count as visible. */
  readonly since: number | null;
}

export const INITIAL_VISIBILITY: VisibilityState = { page: null, ratio: 0, tabVisible: false, since: null };

export type VisibilityInput =
  | { readonly type: "page"; readonly page: number | null; readonly at: number }
  | { readonly type: "ratio"; readonly ratio: number; readonly at: number }
  | { readonly type: "tab"; readonly visible: boolean; readonly at: number }
  /** The viewer closes: the visit ends and everything resets. */
  | { readonly type: "stop"; readonly at: number };

export interface VisibilityStep {
  readonly state: VisibilityState;
  /** The visit that just ended, when it lasted long enough. */
  readonly visit: PageVisit | null;
}

function counts(state: Pick<VisibilityState, "page" | "ratio" | "tabVisible">): boolean {
  return state.page !== null && state.tabVisible && state.ratio >= MIN_VISIBLE_RATIO;
}

function applyInput(state: VisibilityState, input: VisibilityInput): VisibilityState {
  switch (input.type) {
    case "page":
      return { ...state, page: input.page };
    case "ratio":
      return { ...state, ratio: input.ratio };
    case "tab":
      return { ...state, tabVisible: input.visible };
    case "stop":
      return INITIAL_VISIBILITY;
  }
}

function endedVisit(state: VisibilityState, at: number): PageVisit | null {
  if (state.since === null || state.page === null) return null;
  const ms = Math.max(0, Math.round(at - state.since));
  return ms >= MIN_VISIT_MS ? { page: state.page, ms } : null;
}

/** One input: the next state, and the visit it ended (if any). */
export function stepVisibility(state: VisibilityState, input: VisibilityInput): VisibilityStep {
  const next = applyInput(state, input);
  const samePage = next.page === state.page;
  const was = state.since !== null;
  const now = counts(next);
  if (was && now && samePage) return { state: { ...next, since: state.since }, visit: null };
  const visit = was ? endedVisit(state, input.at) : null;
  return { state: { ...next, since: now ? input.at : null }, visit };
}
