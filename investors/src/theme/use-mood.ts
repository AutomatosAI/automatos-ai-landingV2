import { useSyncExternalStore } from "react";

import { currentMood } from "./apply-mood";
import { isMood, type Mood } from "./mood";

/** Watches data-mood on <body>, which applyMood and saveMood set. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { attributes: true, attributeFilter: ["data-mood"] });
  return () => observer.disconnect();
}

function snapshot(): Mood {
  const shown = document.body.dataset.mood;
  return isMood(shown) ? shown : currentMood();
}

/** The mood the page shows now, also when another tab or the system changes it. */
export function useMood(): Mood {
  return useSyncExternalStore(subscribe, snapshot);
}
