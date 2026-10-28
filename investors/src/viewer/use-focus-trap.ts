import { useEffect } from "react";

import { nextFocusStop, type FocusStop } from "./focus-cycle";

/** What can take focus; a negative tabIndex keeps an element out of Tab's order. */
const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";

/** The container's Tab stops, in document order (the container itself is not one). */
function focusStops(container: HTMLElement): ReadonlyArray<FocusStop<HTMLElement>> {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter((element) => element.tabIndex >= 0)
    .map((element) => ({ target: element, disabled: element.matches(":disabled") }));
}

function isTab(event: KeyboardEvent): boolean {
  return event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey && !event.defaultPrevented;
}

/**
 * While `active`, focus stays in `container` (the slideshow, W3-RVW-1): Tab
 * and Shift+Tab go round its enabled controls (focus-cycle.ts), and focus
 * that lands outside it, on the page under the slideshow, comes back to it.
 * Nothing is listened to while inactive.
 */
export function useFocusTrap(container: HTMLElement | null, active: boolean): void {
  useEffect(() => {
    if (!container || !active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTab(event)) return;
      const stops = focusStops(container);
      const current = stops.findIndex((stop) => stop.target === document.activeElement);
      event.preventDefault();
      (nextFocusStop(stops, current, event.shiftKey) ?? container).focus({ preventScroll: true });
    };
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && container.contains(event.target)) return;
      container.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [container, active]);
}
