import { createContext, useContext } from "react";

import type { Tracker } from "./tracker";

/** The signed-in investor's tracker; null while nobody is signed in (and in tests without the provider). */
export const TrackerContext = createContext<Tracker | null>(null);

export function useTracker(): Tracker | null {
  return useContext(TrackerContext);
}
