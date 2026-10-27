import { lazy, Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useMe } from "@/api/me";
import { useAuthState } from "@/auth";
import { PageLoading } from "@/components/shell/PageLoading";
import { ADMIN_DOCUMENTS_PATH, ADMIN_INVESTORS_PATH, ADMIN_PATH } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { ApiErrorPage } from "@/pages/ApiErrorPage";
import { strings } from "@/strings";

import { ADMIN_SECTIONS_PATH } from "./section-paths";

const copy = strings.admin;

// The toasts (the section editor's saved/failed) load with the admin area: investors never download them.
const Toaster = lazy(() => import("@/components/ui/sonner").then((module) => ({ default: module.Toaster })));

/**
 * The admin sections, in nav order. `end`: the overview is /admin itself, so
 * it is not marked current on its sub-pages; Investors stays current on an
 * investor's page, Sections in a section's editor.
 */
const ADMIN_LINKS = [
  { to: ADMIN_PATH, label: copy.nav.overview, end: true },
  { to: ADMIN_DOCUMENTS_PATH, label: copy.nav.documents, end: false },
  { to: ADMIN_INVESTORS_PATH, label: copy.nav.investors, end: false },
  { to: ADMIN_SECTIONS_PATH, label: copy.nav.sections, end: false },
] as const;

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
            end={link.end}
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
      <Suspense fallback={null}>
        <Toaster />
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
