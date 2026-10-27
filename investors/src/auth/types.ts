/**
 * The auth seam's shapes (KP10): the app sees these, never a Clerk type, so
 * the e2e build can swap Clerk for the fake without touching a page.
 */

export type AuthState =
  | { readonly status: "loading" }
  | { readonly status: "signed_out" }
  | { readonly status: "signed_in"; readonly userId: string; readonly email: string | null }
  /** The sign-in service failed to load. */
  | { readonly status: "unavailable" }
  /** No publishable key in the runtime config: the app runs signed-out only. */
  | { readonly status: "disabled" };

export type AuthStatus = AuthState["status"];

export interface AuthActions {
  readonly openSignIn: () => void;
  readonly openSignUp: () => void;
  readonly signOut: () => Promise<void>;
}

export interface AuthValue {
  readonly state: AuthState;
  readonly actions: AuthActions;
}

/** Resolves the current session token, or null when signed out. */
export type TokenSource = () => Promise<string | null>;
