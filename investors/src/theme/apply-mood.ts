import { DARK_SCHEME_QUERY, MOOD_STORAGE_KEY, resolveMood, type Mood } from "./mood";

/** localStorage can throw (blocked storage, private modes): treat that as unset. */
function readStoredMood(): string | null {
  try {
    return window.localStorage.getItem(MOOD_STORAGE_KEY);
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_SCHEME_QUERY).matches;
}

export function currentMood(): Mood {
  return resolveMood({ stored: readStoredMood(), prefersDark: systemPrefersDark() });
}

/**
 * Sets data-mood on <body> now, and again when the site's toggle changes it
 * in another tab or the system scheme changes. Returns the unsubscribe.
 */
export function applyMood(): () => void {
  const apply = () => document.body.setAttribute("data-mood", currentMood());
  apply();
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === MOOD_STORAGE_KEY) apply();
  };
  window.addEventListener("storage", onStorage);
  const scheme = typeof window.matchMedia === "function" ? window.matchMedia(DARK_SCHEME_QUERY) : null;
  scheme?.addEventListener("change", apply);
  return () => {
    window.removeEventListener("storage", onStorage);
    scheme?.removeEventListener("change", apply);
  };
}

/**
 * The visitor's choice: shown at once and saved where the site keeps it, so
 * automatos.app's pages (and the portal in other tabs) follow it.
 */
export function saveMood(mood: Mood): void {
  document.body.setAttribute("data-mood", mood);
  try {
    window.localStorage.setItem(MOOD_STORAGE_KEY, mood);
  } catch {
    // Blocked storage: this page still switches; the choice is not kept.
  }
}
