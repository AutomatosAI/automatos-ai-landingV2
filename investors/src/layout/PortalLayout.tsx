import { Outlet } from "react-router-dom";

import { useMe } from "@/api/me";
import { useAuthState } from "@/auth";
import { AppHeader } from "@/components/shell/AppHeader";

import { portalNav } from "./nav";
import { NavSheet } from "./NavSheet";
import { Sidebar } from "./Sidebar";

function PortalFrame({ userId }: { readonly userId: string }) {
  // PortalGate has /me cached before this renders.
  const me = useMe(userId);
  const items = me.data ? portalNav(me.data) : [];
  const hasNav = items.length > 0;
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader menu={hasNav ? <NavSheet items={items} /> : undefined} />
      <div className="mx-auto flex w-full max-w-6xl flex-1">
        {hasNav && <Sidebar items={items} />}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * The signed-in portal's frame (ported from the reference Dashboard, KP12):
 * the header with the account menu, the sidebar on desktop and the sheet
 * menu on phones, the page beside them.
 */
export function PortalLayout() {
  const state = useAuthState();
  // PortalGate renders this only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <PortalFrame userId={state.userId} />;
}
