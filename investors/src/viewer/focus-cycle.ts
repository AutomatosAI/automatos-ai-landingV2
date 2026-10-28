/**
 * Where Tab goes while the slideshow is open (W3-RVW-1): round its own
 * controls, never out to the page hidden under it. Pure: use-focus-trap.ts
 * lists the slideshow's focusable elements in document order and moves focus
 * to the answer.
 */

/** One element Tab could stop on. */
export interface FocusStop<T> {
  readonly target: T;
  /** A disabled control: Tab passes it by. */
  readonly disabled: boolean;
}

/**
 * The stop Tab (or Shift+Tab, `shift`) moves to from `current`: its index in
 * `stops`, or -1 for the container itself (or anything not in the list). From
 * a stop, the next enabled one, wrapping at either end; from the container,
 * the first enabled one (the last with Shift). Null when none is enabled.
 */
export function nextFocusStop<T>(stops: ReadonlyArray<FocusStop<T>>, current: number, shift: boolean): T | null {
  const count = stops.length;
  const step = shift ? -1 : 1;
  const inList = current >= 0 && current < count;
  const from = inList ? current : shift ? count : -1;
  for (let offset = 1; offset <= count; offset += 1) {
    const stop = stops[(((from + step * offset) % count) + count) % count];
    if (stop && !stop.disabled) return stop.target;
  }
  return null;
}
