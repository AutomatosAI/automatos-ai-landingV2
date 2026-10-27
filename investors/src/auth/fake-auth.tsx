import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

import { AuthContext } from "./context";
import {
  DEFAULT_FAKE_SESSION,
  FAKE_AUTH_STORAGE_KEY,
  fakeAuthState,
  fakeToken,
  parseFakeSession,
  type FakeSession,
} from "./fake-session";
import { setTokenSource } from "./token";
import type { AuthActions, AuthValue } from "./types";

/*
 * E2E builds only (KP10): signs in without Clerk, from localStorage, so
 * Playwright can render every screen with the API mocked.
 */

function readStored(): string | null {
  try {
    return window.localStorage.getItem(FAKE_AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(session: FakeSession | null): void {
  try {
    if (session === null) window.localStorage.removeItem(FAKE_AUTH_STORAGE_KEY);
    else window.localStorage.setItem(FAKE_AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage blocked: the session lasts until the page reloads.
  }
}

export function FakeAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<FakeSession | null>(() => parseFakeSession(readStored()));

  useLayoutEffect(() => {
    setTokenSource(async () => (session === null ? null : fakeToken(session)));
    return () => setTokenSource(null);
  }, [session]);

  const persist = useCallback((next: FakeSession | null) => {
    writeStored(next);
    setSession(next);
  }, []);

  const actions = useMemo<AuthActions>(
    () => ({
      openSignIn: () => persist(DEFAULT_FAKE_SESSION),
      openSignUp: () => persist(DEFAULT_FAKE_SESSION),
      signOut: async () => persist(null),
    }),
    [persist],
  );

  const value = useMemo<AuthValue>(() => ({ state: fakeAuthState(session), actions }), [session, actions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
