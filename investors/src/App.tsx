import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AdminGate } from "@/admin/AdminGate";
import { useClearCacheOnSignOut } from "@/api/query-client";
import { AppShell } from "@/components/shell/AppShell";
import { PortalGate } from "@/components/shell/PortalGate";
import { ADMIN_DOCUMENTS_PATH } from "@/lib/paths";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { Profile } from "@/pages/Profile";

// Admin screens load on demand: investors never download them.
const AdminDocuments = lazy(() => import("@/pages/admin/Documents").then((module) => ({ default: module.AdminDocuments })));

export function App() {
  useClearCacheOnSignOut();
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route element={<PortalGate />}>
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<AdminGate />}>
            {/* The admin overview (W1-16) replaces this redirect. */}
            <Route index element={<Navigate to={ADMIN_DOCUMENTS_PATH} replace />} />
            <Route path="documents" element={<AdminDocuments />} />
          </Route>
          {/* The portal's pages (W1-12) replace this. */}
          <Route path="*" element={<PlaceholderPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
