import { useCallback, useEffect, useRef, useState } from "react";
import { useHref, useLocation } from "react-router-dom";

import { anchorFactsOf, anchorOf, clickFactsOf, leavesPage } from "./leave-guard";

export interface LeaveGuard {
  /** A link was followed while the draft was unsaved: the page asks before it goes. */
  readonly asking: boolean;
  /** Stays on the page; the draft is kept. */
  readonly stay: () => void;
  /** Follows the held link; the draft is dropped. */
  readonly leave: () => void;
}

interface GuardFlags {
  /** True during the guard's own re-click of the held link. */
  passing: boolean;
  /** True once the admin chose to leave: the browser is not asked a second time. */
  released: boolean;
}

/** Clicks the held link again, past the guard, so the router (or the browser) follows it as usual. */
function follow(anchor: HTMLAnchorElement, flags: GuardFlags) {
  flags.released = true;
  if (!anchor.isConnected) {
    window.location.assign(anchor.href);
    return;
  }
  flags.passing = true;
  try {
    anchor.click();
  } finally {
    flags.passing = false;
  }
}

/**
 * While `active` (the editor has unsaved changes): a link click that would
 * leave the page is held, before react-router or the browser acts on it,
 * until the admin answers; a reload or a closing tab gets the browser's
 * prompt. The back button is not caught: <BrowserRouter> cannot block it.
 */
export function useLeaveGuard(active: boolean): LeaveGuard {
  const [held, setHeld] = useState<HTMLAnchorElement | null>(null);
  const flags = useRef<GuardFlags>({ passing: false, released: false });
  const here = useHref(useLocation());

  useEffect(() => {
    if (!active) return undefined;
    const current = new URL(here, window.location.href).href;
    const guard = flags.current;
    guard.released = false;
    function holdClick(event: MouseEvent) {
      if (guard.passing) return;
      const anchor = anchorOf(event.target);
      if (anchor === null || !leavesPage(clickFactsOf(event), anchorFactsOf(anchor), current)) return;
      event.preventDefault();
      // Before react-router's handler on the root: the link goes nowhere until the admin answers.
      event.stopPropagation();
      setHeld(anchor);
    }
    function askTheBrowser(event: BeforeUnloadEvent) {
      if (guard.released) return;
      event.preventDefault();
      // Older browsers ask only when returnValue is set (the event's own field, not app state).
      event.returnValue = "";
    }
    window.addEventListener("click", holdClick, true);
    window.addEventListener("beforeunload", askTheBrowser);
    return () => {
      window.removeEventListener("click", holdClick, true);
      window.removeEventListener("beforeunload", askTheBrowser);
    };
  }, [active, here]);

  const stay = useCallback(() => setHeld(null), []);
  const leave = useCallback(() => {
    setHeld(null);
    if (held !== null) follow(held, flags.current);
  }, [held]);

  return { asking: held !== null, stay, leave };
}
