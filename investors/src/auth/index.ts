/**
 * The auth seam (KP10): the app imports sign-in from here and nowhere else.
 * clerk-auth.tsx is the only module that touches Clerk; fake-auth.tsx stands
 * in for it in the e2e build.
 */
export { AccountMenu } from "./AccountMenu";
export { AuthButtons } from "./AuthButtons";
export { AuthProvider } from "./AuthProvider";
export { useAuthActions, useAuthState } from "./context";
export { AUTH_MODE } from "./mode";
export { SignedInGate } from "./SignedInGate";
export { getToken, lastToken } from "./token";
export type { AuthActions, AuthState, AuthStatus } from "./types";
