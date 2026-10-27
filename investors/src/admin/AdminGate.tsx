import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useMe } from "@/api/me";
import { useAuthState } from "@/auth";
import { PageLoading } from "@/components/shell/PageLoading";
import { ADMIN_DOCUMENTS_PATH } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { ApiErrorPage } from "@/pages/ApiErrorPage";
import { strings } from "@/strings";

const copy = strings.admin;

/** The admin sections, in nav order (the overview and investors join in W1-16 and W1-17). */
const ADMIN_LINKS = [{ to: ADMIN_DOCUMENTS_PATH, label: copy.nav.documents }] as const;

function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <nav
        aria-label={copy.navLabel}
        className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em]"
      >
        <span className="text-muted-foreground">{copy.label}</span>
        {ADMIN_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn("underline-offset-4 hover:underline", isActive ? "text-foreground underline" : "text-muted-foreground")
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

function AdminOnly({ userId }: { readonly userId: string }) {
  // The portal gate (PortalGate) has /me cached before any admin route renders.
  const me = useMe(userId);
  if (!me.data) return <PageLoading />;
  // Manners only: every /admin call is checked against the allowlist on the server (KP3).
  if (!me.data.isAdmin) return <ApiErrorPage screen="not_available" />;
  return <AdminLayout />;
}

/** /investors/admin/*: the admin area for admins, 'Not available' for everyone else. */
export function AdminGate() {
  const state = useAuthState();
  // PortalGate renders this only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <AdminOnly userId={state.userId} />;
}
