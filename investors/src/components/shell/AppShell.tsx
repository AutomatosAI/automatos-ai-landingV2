import type { ReactNode } from "react";

import { AppHeader } from "./AppHeader";

/** The header and one page: the teaser, loading and status pages (the signed-in portal uses layout/PortalLayout). */
export function AppShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
