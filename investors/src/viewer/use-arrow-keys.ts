import { useEffect, useRef } from "react";

import { arrowStep, isInOwnWidget } from "./page-model";

/**
 * Left and right arrows turn the page, unless a field, menu or dialog has
 * them, or the viewer is presenting (`enabled` false: present mode has its own keys).
 */
export function useArrowKeys(onStep: (delta: number) => void, enabled = true): void {
  const latest = useRef(onStep);
  useEffect(() => {
    latest.current = onStep;
  }, [onStep]);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const delta = arrowStep({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        defaultPrevented: event.defaultPrevented,
        inOwnWidget: isInOwnWidget(event.target),
      });
      if (delta === null) return;
      event.preventDefault();
      latest.current(delta);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
