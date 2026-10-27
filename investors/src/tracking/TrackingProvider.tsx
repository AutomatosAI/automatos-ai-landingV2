import { useEffect, useState, type ReactNode } from "react";

import { useAuthState } from "@/auth";

import { TrackerContext } from "./context";
import { createTracker, type Tracker } from "./tracker";

/**
 * One tracker per signed-in account: it starts once the visitor is signed
 * in and stops when they sign out or another account signs in, so one
 * investor's queue never goes out under another's token.
 */
export function TrackingProvider({ children }: { readonly children: ReactNode }) {
  const state = useAuthState();
  const userId = state.status === "signed_in" ? state.userId : null;
  const [tracker, setTracker] = useState<Tracker | null>(null);

  useEffect(() => {
    if (userId === null) return;
    const next = createTracker();
    next.start();
    setTracker(next);
    return () => {
      next.stop();
      setTracker(null);
    };
  }, [userId]);

  return <TrackerContext.Provider value={tracker}>{children}</TrackerContext.Provider>;
}
