import { createContext, useContext } from "react";

import type { AuthActions, AuthState, AuthValue } from "./types";

const NO_ACTIONS: AuthActions = Object.freeze({
  openSignIn: () => undefined,
  openSignUp: () => undefined,
  signOut: async () => undefined,
});

/** No key: nobody can sign in, and the app says so (KP4). */
export const DISABLED_AUTH: AuthValue = Object.freeze({
  state: Object.freeze({ status: "disabled" }),
  actions: NO_ACTIONS,
});

/** Filled by the Clerk or the fake provider; tests provide it directly. */
export const AuthContext = createContext<AuthValue>(DISABLED_AUTH);

export function useAuthState(): AuthState {
  return useContext(AuthContext).state;
}

export function useAuthActions(): AuthActions {
  return useContext(AuthContext).actions;
}
