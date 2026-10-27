import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served by the site's Express server at automatos.app/investors
// (server/investors/static.js): assets under /investors/assets/.
export default defineConfig({
  base: "/investors/",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: { sourcemap: false },
});
