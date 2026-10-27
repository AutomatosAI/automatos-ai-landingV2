import { Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/shell/AppShell";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="*" element={<PlaceholderPage />} />
      </Route>
    </Routes>
  );
}
