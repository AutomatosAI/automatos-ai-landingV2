import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AdminGate } from "@/admin/AdminGate";
import { useClearCacheOnSignOut } from "@/api/query-client";
import { PortalGate } from "@/components/shell/PortalGate";
import { PortalLayout } from "@/layout/PortalLayout";
import { HOME_PATH } from "@/lib/paths";
import { Contact } from "@/pages/Contact";
import { Documents } from "@/pages/Documents";
import { Faq } from "@/pages/Faq";
import { Home } from "@/pages/Home";
import { Profile } from "@/pages/Profile";
import { Team } from "@/pages/Team";
import { Viewer } from "@/pages/Viewer";
import { TrackingProvider } from "@/tracking/TrackingProvider";

// Admin screens load on demand: investors never download them (nor the overview's chart library).
const AdminOverview = lazy(() => import("@/pages/admin/Overview").then((module) => ({ default: module.AdminOverview })));
const AdminDocuments = lazy(() => import("@/pages/admin/Documents").then((module) => ({ default: module.AdminDocuments })));
const AdminInvestors = lazy(() => import("@/pages/admin/Investors").then((module) => ({ default: module.AdminInvestors })));
const AdminInvestorDetail = lazy(() =>
  import("@/pages/admin/InvestorDetail").then((module) => ({ default: module.AdminInvestorDetail })),
);
const AdminSections = lazy(() => import("@/pages/admin/Sections").then((module) => ({ default: module.AdminSections })));
const AdminSectionEditor = lazy(() =>
  import("@/pages/admin/Sections").then((module) => ({ default: module.AdminSectionEditor })),
);

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
            <Route path="team" element={<Team />} />
            <Route path="faq" element={<Faq />} />
            <Route path="contact" element={<Contact />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<AdminGate />}>
              <Route index element={<AdminOverview />} />
              <Route path="documents" element={<AdminDocuments />} />
              <Route path="investors" element={<AdminInvestors />} />
              <Route path="investors/:id" element={<AdminInvestorDetail />} />
              <Route path="sections" element={<AdminSections />} />
              <Route path="sections/:slug" element={<AdminSectionEditor />} />
            </Route>
            <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
          </Route>
        </Route>
      </Routes>
    </TrackingProvider>
  );
}
