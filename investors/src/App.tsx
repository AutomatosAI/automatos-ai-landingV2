import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AdminGate } from "@/admin/AdminGate";
import { useClearCacheOnSignOut } from "@/api/query-client";
import { PortalGate } from "@/components/shell/PortalGate";
import { PortalLayout } from "@/layout/PortalLayout";
import { ADMIN_DOCUMENTS_PATH, HOME_PATH } from "@/lib/paths";
import { Documents } from "@/pages/Documents";
import { Home } from "@/pages/Home";
import { Profile } from "@/pages/Profile";
import { Viewer } from "@/pages/Viewer";
import { TrackingProvider } from "@/tracking/TrackingProvider";

// Admin screens load on demand: investors never download them.
const AdminDocuments = lazy(() => import("@/pages/admin/Documents").then((module) => ({ default: module.AdminDocuments })));

export function App() {
  useClearCacheOnSignOut();
  return (
    <TrackingProvider>
      <Routes>
        <Route element={<PortalGate />}>
          <Route element={<PortalLayout />}>
            <Route index element={<Home />} />
            <Route path="documents" element={<Documents />} />
            <Route path="documents/:id" element={<Viewer />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<AdminGate />}>
              {/* The admin overview (W1-16) replaces this redirect. */}
              <Route index element={<Navigate to={ADMIN_DOCUMENTS_PATH} replace />} />
              <Route path="documents" element={<AdminDocuments />} />
            </Route>
            <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
          </Route>
        </Route>
      </Routes>
    </TrackingProvider>
  );
}
