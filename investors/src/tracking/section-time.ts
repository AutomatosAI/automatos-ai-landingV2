/**
 * How long a section page was read (US-009): only the time it was open in a
 * visible tab. A stretch of visible time starts when the page opens in a
 * visible tab or the tab comes back, and ends when the tab hides or the
 * investor leaves the page; each stretch of MIN_SECTION_MS or more is
 * reported, a shorter one is dropped (a tab flicked past, React's
 * development double mount). Pure steps over timestamps; the hook
 * (use-section-time.ts) feeds it the browser's events.
 */

export const MIN_SECTION_MS = 1000;

export interface SectionClock {
  /** When the current visible stretch started; null while the tab is hidden or the page has gone. */
  readonly since: number | null;
}

export type SectionInput =
  | { readonly type: "tab"; readonly visible: boolean; readonly at: number }
  /** The investor left the page. */
  | { readonly type: "leave"; readonly at: number };

export interface SectionStep {
  readonly clock: SectionClock;
  /** The visible stretch that just ended, when it lasted long enough. */
  readonly ms: number | null;
}

/** The page opens: time runs only if the tab is visible. */
export function startSectionClock(tabVisible: boolean, at: number): SectionClock {
  return { since: tabVisible ? at : null };
}

function stretchMs(since: number, at: number): number | null {
  const ms = Math.max(0, Math.round(at - since));
  return ms >= MIN_SECTION_MS ? ms : null;
}

/** One input: the next clock, and the visible time it ended (if any). */
export function stepSectionClock(clock: SectionClock, input: SectionInput): SectionStep {
  const running = input.type === "tab" && input.visible;
  if (running && clock.since !== null) return { clock, ms: null };
  const ms = clock.since === null ? null : stretchMs(clock.since, input.at);
  return { clock: { since: running ? input.at : null }, ms };
}
