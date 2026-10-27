import { defineConfig } from "vitest/config";

// Root tests: the investor portal's server modules only. The React app in
// investors/ has its own vitest config.
export default defineConfig({
  test: {
    include: ["server/investors/**/__tests__/**/*.test.js"],
    environment: "node",
    // Over a shared Postgres (CI), test files reset the same investors schema,
    // so they run one at a time; each PGlite database is private to its file.
    fileParallelism: !process.env.INVESTORS_TEST_DATABASE_URL,
  },
});
