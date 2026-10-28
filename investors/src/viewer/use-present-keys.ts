import { useEffect, useRef } from "react";

import { isControl, isField, presentAction, type PresentAction } from "./present-keys";

/** Present mode's keys (present-keys.ts) while `active`; the page's arrow keys stand down meanwhile. */
export function usePresentKeys(active: boolean, onAction: (action: PresentAction) => void): void {
  const latest = useRef(onAction);
  useEffect(() => {
    latest.current = onAction;
  }, [onAction]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const action = presentAction({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        defaultPrevented: event.defaultPrevented,
        inField: isField(event.target),
        onControl: isControl(event.target),
      });
      if (action === null) return;
      event.preventDefault();
      latest.current(action);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);
}
