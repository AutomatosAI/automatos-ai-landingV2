import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Root tests: the investor portal's server modules only. The React app in
// investors/ has its own vitest config.
export default defineConfig({
  test: {
    include: ["server/investors/**/__tests__/**/*.test.js"],
    environment: "node",
    // No root test may load the real Clerk SDK (it would call Clerk's API):
    // the package resolves to a stub the tests drive.
    alias: [
      {
        find: /^@clerk\/backend$/,
        replacement: fileURLToPath(new URL("./server/investors/__tests__/helpers/clerk-sdk.js", import.meta.url)),
      },
    ],
    // Over a shared Postgres (CI), test files reset the same investors schema,
    // so they run one at a time; each PGlite database is private to its file.
    fileParallelism: !process.env.INVESTORS_TEST_DATABASE_URL,
    // Each file boots its own PGlite (WASM Postgres) and migrates it, all at
    // once: on a busy machine that alone outlasts the 10 s/5 s defaults.
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
});
