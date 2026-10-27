import { Navigate, Outlet, useLocation } from "react-router-dom";

import { landingRedirect, meErrorScreen, useMe } from "@/api/me";
import { SignedInGate, useAuthState } from "@/auth";
import { ApiErrorPage } from "@/pages/ApiErrorPage";
import { Teaser } from "@/pages/Teaser";

import { AppShell } from "./AppShell";
import { PageLoading } from "./PageLoading";

/** Asks the server who the investor is, then sends them to the profile form or lets them through. */
function MeGate({ userId }: { userId: string }) {
  const me = useMe(userId);
  const { pathname } = useLocation();
  if (me.isPending) return <AppShell><PageLoading /></AppShell>;
  if (me.isError) {
    return (
      <AppShell>
        <ApiErrorPage screen={meErrorScreen(me.error)} onRetry={() => void me.refetch()} />
      </AppShell>
    );
  }
  const redirect = landingRedirect(me.data, pathname);
  if (redirect !== null) return <Navigate to={redirect} replace />;
  return <Outlet />;
}

function SignedInRoutes() {
  const state = useAuthState();
  // SignedInGate renders this only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <MeGate userId={state.userId} />;
}

const teaser = (
  <AppShell>
    <Teaser />
  </AppShell>
);

/**
 * Every app page sits behind this: signed out → the teaser; signed in → the
 * investor's pages, in the portal's layout. While sign-in loads the teaser
 * shows with its buttons disabled, so a sign-in service that never loads
 * still leaves the page readable.
 */
export function PortalGate() {
  return (
    <SignedInGate signedOut={teaser} loading={teaser}>
      <SignedInRoutes />
    </SignedInGate>
  );
}
