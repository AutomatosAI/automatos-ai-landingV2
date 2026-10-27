import { APP_BASENAME } from "@/lib/paths";
import type { Mood } from "@/theme/mood";

import type { AuthState } from "./types";

/** What clerk-auth.tsx reads from Clerk's hooks; kept plain so the mapping is testable. */
export interface ClerkSnapshot {
  /** useClerk().status: 'error' once clerk-js failed to load (Clerk gives up after 15 s). */
  readonly clerkStatus: "loading" | "ready" | "degraded" | "error";
  readonly isLoaded: boolean;
  readonly isSignedIn: boolean | undefined;
  readonly userId: string | null | undefined;
  readonly email: string | null | undefined;
}

const LOADING: AuthState = Object.freeze({ status: "loading" });
const SIGNED_OUT: AuthState = Object.freeze({ status: "signed_out" });
const UNAVAILABLE: AuthState = Object.freeze({ status: "unavailable" });

export function deriveClerkState(snapshot: ClerkSnapshot): AuthState {
  if (snapshot.clerkStatus === "error") return UNAVAILABLE;
  if (!snapshot.isLoaded) return LOADING;
  if (snapshot.isSignedIn && snapshot.userId) {
    return Object.freeze({ status: "signed_in", userId: snapshot.userId, email: snapshot.email ?? null });
  }
  return SIGNED_OUT;
}

/**
 * Where Clerk sends the visitor after signing in or up: back to the app page
 * they were on, never outside the app (Clerk's own default is the site root).
 */
export function returnPath({ pathname, search }: { pathname: string; search: string }): string {
  const insideApp = pathname === APP_BASENAME || pathname.startsWith(`${APP_BASENAME}/`);
  return insideApp ? `${pathname}${search}` : APP_BASENAME;
}

export interface ClerkAppearance {
  readonly variables: Readonly<Record<string, string>>;
}

/** Clerk's modal in the site's look (KP13): its type, square corners, the mood's colours. */
const MOOD_COLOURS: Record<Mood, Readonly<Record<string, string>>> = {
  bone: {
    colorPrimary: "#0F1411",
    colorPrimaryForeground: "#F2EDE4",
    colorBackground: "#F2EDE4",
    colorForeground: "#0F1411",
    colorMutedForeground: "#6E6960",
    colorInput: "#ECE6DA",
    colorInputForeground: "#0F1411",
    colorNeutral: "#0F1411",
  },
  pitch: {
    colorPrimary: "#EFE9DD",
    colorPrimaryForeground: "#0E1311",
    colorBackground: "#161C19",
    colorForeground: "#EFE9DD",
    colorMutedForeground: "#8A857C",
    colorInput: "#0E1311",
    colorInputForeground: "#EFE9DD",
    colorNeutral: "#EFE9DD",
  },
};

export function clerkAppearance(mood: Mood): ClerkAppearance {
  return Object.freeze({
    variables: Object.freeze({
      ...MOOD_COLOURS[mood],
      borderRadius: "2px",
      fontFamily: '"Geist", -apple-system, "Helvetica Neue", sans-serif',
    }),
  });
}
