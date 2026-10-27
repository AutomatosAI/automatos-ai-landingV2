import { defineConfig } from "vitest/config";

// Root tests: the investor portal's server modules only. The React app in
// investors/ has its own vitest config.
export default defineConfig({
  test: {
    include: ["server/investors/**/__tests__/**/*.test.js"],
    environment: "node",
  },
});
