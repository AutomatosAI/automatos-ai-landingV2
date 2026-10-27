import { useEffect } from "react";

import { useTracker } from "./context";
import { sectionView } from "./events";
import { startSectionClock, stepSectionClock, type SectionInput } from "./section-time";

const now = () => performance.now();
const tabVisible = () => document.visibilityState === "visible";

/**
 * Reports a section page's visible time as section_view (US-009), through
 * the tracker: when the tab hides and when the investor leaves the page.
 * It listens on document, like the PDF viewer, so the time is queued before
 * the tracker's own visibilitychange listener (on window) sends the queue.
 */
export function useSectionTime(section: string): void {
  const tracker = useTracker();
  useEffect(() => {
    if (tracker === null) return;
    let clock = startSectionClock(tabVisible(), now());
    const apply = (input: SectionInput) => {
      const step = stepSectionClock(clock, input);
      clock = step.clock;
      if (step.ms !== null) tracker.track(sectionView(section, step.ms));
    };
    const onChange = () => apply({ type: "tab", visible: tabVisible(), at: now() });
    document.addEventListener("visibilitychange", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      apply({ type: "leave", at: now() });
    };
  }, [tracker, section]);
}
