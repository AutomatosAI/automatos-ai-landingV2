import { Route, Routes } from "react-router-dom";

import { useClearCacheOnSignOut } from "@/api/query-client";
import { AppShell } from "@/components/shell/AppShell";
import { PortalGate } from "@/components/shell/PortalGate";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { Profile } from "@/pages/Profile";

export function App() {
  useClearCacheOnSignOut();
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route element={<PortalGate />}>
          <Route path="profile" element={<Profile />} />
          {/* The portal's pages (W1-12) replace this. */}
          <Route path="*" element={<PlaceholderPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
