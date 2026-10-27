import { z } from "zod";

import type { AuthState } from "./types";

/**
 * The e2e build's stand-in for Clerk (KP10). The gate greps the builds for
 * this marker: the e2e build must carry it, the production build must not.
 * It is also the localStorage key Playwright writes to start signed in.
 */
export const FAKE_AUTH_MARKER = "INVESTORS_E2E_FAKE_AUTH";
export const FAKE_AUTH_STORAGE_KEY = FAKE_AUTH_MARKER;

const fakeSessionSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
});

export type FakeSession = Readonly<z.infer<typeof fakeSessionSchema>>;

/** Invented (KP5): who "Sign in" makes you in the e2e build. */
export const DEFAULT_FAKE_SESSION: FakeSession = Object.freeze({
  userId: "user_e2e_ada",
  email: "ada@example.com",
});

/** The stored session, or null (signed out) for anything missing or malformed. */
export function parseFakeSession(raw: string | null): FakeSession | null {
  if (raw === null) return null;
  try {
    const parsed = fakeSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? Object.freeze(parsed.data) : null;
  } catch {
    return null;
  }
}

export function fakeAuthState(session: FakeSession | null): AuthState {
  if (session === null) return Object.freeze({ status: "signed_out" });
  return Object.freeze({ status: "signed_in", userId: session.userId, email: session.email });
}

/** Never verified by anything: the e2e run mocks every API call. */
export function fakeToken(session: FakeSession): string {
  return `e2e.${session.userId}`;
}
