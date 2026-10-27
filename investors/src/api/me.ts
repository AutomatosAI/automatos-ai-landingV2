import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { PROFILE_PATH } from "@/lib/paths";
import { CHEQUE_SIZES, INVESTOR_TYPES, SOURCES, type ChequeSize, type InvestorType, type Source } from "@/profile/options";

import { fetchJson } from "./client";
import { screenForError, type ErrorScreen } from "./errors";

/**
 * GET /api/investors/me: who the signed-in investor is, and whether the
 * first-visit profile is done (server/investors/routes/me.js). PUT /me saves
 * the profile form and answers the same shape. A 404 means the portal is not
 * fully there: the app shows the unavailable screen.
 */
export const meSchema = z.object({
  investor: z.object({
    id: z.string().min(1),
    email: z.string(),
    name: z.string().nullable(),
    firm: z.string().nullable(),
    title: z.string().nullable(),
    investorType: z.enum(INVESTOR_TYPES).nullable(),
    chequeSize: z.enum(CHEQUE_SIZES).nullable(),
    linkedinUrl: z.string().nullable(),
    country: z.string().nullable(),
    source: z.enum(SOURCES).nullable(),
    marketingOptIn: z.boolean(),
  }),
  isAdmin: z.boolean(),
  profileComplete: z.boolean(),
});

export type Me = z.infer<typeof meSchema>;

/** What PUT /me takes: blank optional fields are null. */
export interface ProfileBody {
  readonly name: string;
  readonly firm: string;
  readonly title: string | null;
  readonly investorType: InvestorType;
  readonly chequeSize: ChequeSize | null;
  readonly linkedinUrl: string | null;
  readonly country: string | null;
  readonly source: Source;
  readonly marketingOptIn: boolean;
}

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

export function saveMe(body: ProfileBody): Promise<Me> {
  return fetchJson("/me", { method: "PUT", body, schema: meSchema });
}

/** Saves the profile; the answer replaces the cached /me, so the profile gate opens at once. */
export function useSaveMe(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMe,
    onSuccess: (me) => queryClient.setQueryData(meQueryKey(userId), me),
  });
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
