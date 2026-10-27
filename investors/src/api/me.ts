import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { PROFILE_PATH } from "@/lib/paths";

import { fetchJson } from "./client";
import { screenForError, type ErrorScreen } from "./errors";

/**
 * GET /api/investors/me: who the signed-in investor is, and whether the
 * first-visit profile is done. The server builds the route (W1-07); until
 * then it answers 404 and the app shows the unavailable screen.
 */
export const meSchema = z.object({
  investor: z.object({
    id: z.string().min(1),
    email: z.string(),
    name: z.string().nullable(),
  }),
  isAdmin: z.boolean(),
  profileComplete: z.boolean(),
});

export type Me = z.infer<typeof meSchema>;

/** Keyed by the Clerk user, so one visitor's answer is never shown to the next. */
export function meQueryKey(userId: string) {
  return ["me", userId] as const;
}

export function fetchMe(signal?: AbortSignal): Promise<Me> {
  return fetchJson("/me", { schema: meSchema, signal });
}

export function useMe(userId: string) {
  return useQuery({ queryKey: meQueryKey(userId), queryFn: ({ signal }) => fetchMe(signal) });
}

/** Until the profile is done, every page leads to the profile form; after, anywhere goes. */
export function landingRedirect(me: Me, pathname: string): string | null {
  if (!me.profileComplete && pathname !== PROFILE_PATH) return PROFILE_PATH;
  return null;
}

/** /me missing (404) means the portal is not fully there: the unavailable screen. */
export function meErrorScreen(error: unknown): ErrorScreen {
  const screen = screenForError(error);
  return screen === "not_found" ? "unavailable" : screen;
}
