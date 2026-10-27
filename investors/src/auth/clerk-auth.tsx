import { ClerkProvider, useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { useLayoutEffect, useMemo, type ReactNode } from "react";

import { APP_BASENAME } from "@/lib/paths";
import { currentMood } from "@/theme/apply-mood";

import { clerkAppearance, deriveClerkState, returnPath } from "./clerk-state";
import { AuthContext } from "./context";
import { setTokenSource } from "./token";
import type { AuthActions, AuthValue } from "./types";

/*
 * The only module that touches Clerk (KP10). It turns Clerk's hooks into the
 * seam's AuthValue; pages read that through useAuthState / useAuthActions.
 */

function ClerkBridge({ children }: { children: ReactNode }) {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  // Layout effect: set before any child's data effect asks for a token.
  useLayoutEffect(() => {
    setTokenSource(() => getToken());
    return () => setTokenSource(null);
  }, [getToken]);

  const state = useMemo(
    () => deriveClerkState({ clerkStatus: clerk.status, isLoaded, isSignedIn, userId, email }),
    [clerk.status, isLoaded, isSignedIn, userId, email],
  );

  const actions = useMemo<AuthActions>(
    () => ({
      openSignIn: () => clerk.openSignIn({ fallbackRedirectUrl: returnPath(window.location) }),
      openSignUp: () => clerk.openSignUp({ fallbackRedirectUrl: returnPath(window.location) }),
      signOut: () => clerk.signOut(),
    }),
    [clerk],
  );

  const value = useMemo<AuthValue>(() => ({ state, actions }), [state, actions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function ClerkAuthProvider({ publishableKey, children }: { publishableKey: string; children: ReactNode }) {
  const appearance = useMemo(() => clerkAppearance(currentMood()), []);
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl={APP_BASENAME}
      signInFallbackRedirectUrl={APP_BASENAME}
      signUpFallbackRedirectUrl={APP_BASENAME}
      appearance={appearance}
    >
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  );
}
