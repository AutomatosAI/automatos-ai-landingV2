import { Route, Routes } from "react-router-dom";

import { useClearCacheOnSignOut } from "@/api/query-client";
import { AppShell } from "@/components/shell/AppShell";
import { PortalGate } from "@/components/shell/PortalGate";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

export function App() {
  useClearCacheOnSignOut();
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route element={<PortalGate />}>
          {/* The profile form (W1-07) and the portal's pages (W1-12) replace these. */}
          <Route path="profile" element={<PlaceholderPage />} />
          <Route path="*" element={<PlaceholderPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
