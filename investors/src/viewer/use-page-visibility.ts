import { useCallback, useEffect, useRef } from "react";

import {
  INITIAL_VISIBILITY,
  stepVisibility,
  type OnPageVisible,
  type VisibilityInput,
} from "./visibility-model";

/** Crossing either side of 50% (and fully in or out) is enough for the model. */
const THRESHOLDS = [0, 0.5, 1];

const now = () => performance.now();

/**
 * Feeds the visibility model (visibility-model.ts) from the browser: the
 * rendered page, the frame's intersection with the viewport and the tab's
 * visibility; closing the viewer ends the visit. Each visit of 1000 ms or
 * more goes to onPageVisible. Without IntersectionObserver the frame counts
 * as fully in view.
 */
export function usePageVisibility(frame: Element | null, page: number | null, onPageVisible?: OnPageVisible): void {
  const state = useRef(INITIAL_VISIBILITY);
  const report = useRef(onPageVisible);
  useEffect(() => {
    report.current = onPageVisible;
  }, [onPageVisible]);

  const apply = useCallback((input: VisibilityInput) => {
    const step = stepVisibility(state.current, input);
    state.current = step.state;
    if (step.visit) report.current?.(step.visit.page, step.visit.ms);
  }, []);

  useEffect(() => {
    apply({ type: "page", page, at: now() });
  }, [apply, page]);

  useEffect(() => {
    if (!frame) return;
    if (typeof IntersectionObserver === "undefined") {
      apply({ type: "ratio", ratio: 1, at: now() });
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) apply({ type: "ratio", ratio: entry.intersectionRatio, at: now() });
      },
      { threshold: THRESHOLDS },
    );
    observer.observe(frame);
    return () => {
      observer.disconnect();
      apply({ type: "ratio", ratio: 0, at: now() });
    };
  }, [apply, frame]);

  useEffect(() => {
    const onChange = () => apply({ type: "tab", visible: document.visibilityState === "visible", at: now() });
    onChange();
    document.addEventListener("visibilitychange", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      apply({ type: "stop", at: now() });
    };
  }, [apply]);
}
