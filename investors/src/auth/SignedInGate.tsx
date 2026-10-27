import type { ReactNode } from "react";

import { useAuthState } from "./context";

interface SignedInGateProps {
  /** Shown when signed out, and when sign-in is unavailable or disabled. */
  readonly signedOut: ReactNode;
  /** Shown while the sign-in service loads. */
  readonly loading: ReactNode;
  readonly children: ReactNode;
}

/** Renders its children only for a signed-in visitor. The server checks again on every call (KP3). */
export function SignedInGate({ signedOut, loading, children }: SignedInGateProps) {
  const { status } = useAuthState();
  if (status === "signed_in") return <>{children}</>;
  if (status === "loading") return <>{loading}</>;
  return <>{signedOut}</>;
}
