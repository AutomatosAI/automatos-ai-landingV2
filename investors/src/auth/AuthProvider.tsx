import type { ReactNode } from "react";

import { ClerkAuthProvider } from "./clerk-auth";
import { AuthContext, DISABLED_AUTH } from "./context";
import { FakeAuthProvider } from "./fake-auth";
import { AUTH_MODE } from "./mode";

/**
 * The seam's root. No usable key: signed-out only, sign-in unavailable (KP4).
 * The e2e build swaps Clerk for the fake (KP10); the production build folds
 * AUTH_MODE to "clerk" and never contains the fake.
 */
export function AuthProvider({ publishableKey, children }: { publishableKey: string | null; children: ReactNode }) {
  if (publishableKey === null) return <AuthContext.Provider value={DISABLED_AUTH}>{children}</AuthContext.Provider>;
  if (AUTH_MODE === "fake") return <FakeAuthProvider>{children}</FakeAuthProvider>;
  return <ClerkAuthProvider publishableKey={publishableKey}>{children}</ClerkAuthProvider>;
}
