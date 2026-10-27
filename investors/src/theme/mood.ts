/**
 * The site's mood (KP13), resolved the way automatos.app does it: the
 * visitor's saved choice ('automatos-mood' in localStorage), else the
 * system's colour scheme. Pure: the browser reads live in apply-mood.ts.
 */

export const MOODS = ["bone", "pitch"] as const;
export type Mood = (typeof MOODS)[number];

export const MOOD_STORAGE_KEY = "automatos-mood";
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export function isMood(value: unknown): value is Mood {
  return typeof value === "string" && (MOODS as readonly string[]).includes(value);
}

export interface MoodInputs {
  /** The raw localStorage value, or null when unset or unreadable. */
  readonly stored: string | null;
  /** Whether the system prefers a dark colour scheme. */
  readonly prefersDark: boolean;
}

export function resolveMood({ stored, prefersDark }: MoodInputs): Mood {
  if (isMood(stored)) return stored;
  return prefersDark ? "pitch" : "bone";
}
