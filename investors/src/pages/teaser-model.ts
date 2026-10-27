import type { AuthStatus } from "@/auth";

/**
 * What the teaser offers in place of sign-in:
 * - buttons: Create account and Sign in (disabled while the service loads)
 * - signin_unavailable: the sign-in service failed to load ('Sign-in is unavailable right now')
 * - portal_unavailable: no key in the runtime config, the portal is off (KP4)
 */
export type TeaserSignIn =
  | { readonly kind: "buttons"; readonly disabled: boolean }
  | { readonly kind: "signin_unavailable" }
  | { readonly kind: "portal_unavailable" };

export function teaserSignIn(status: AuthStatus): TeaserSignIn {
  switch (status) {
    case "unavailable":
      return { kind: "signin_unavailable" };
    case "disabled":
      return { kind: "portal_unavailable" };
    case "loading":
      return { kind: "buttons", disabled: true };
    case "signed_out":
    case "signed_in":
      return { kind: "buttons", disabled: false };
  }
}
