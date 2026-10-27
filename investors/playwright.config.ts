import { defineConfig, devices } from "@playwright/test";

/**
 * The portal's browser smoke and screenshots (W1-19). CI only (KP6): the e2e
 * job in .github/workflows/investors.yml runs `npm run build:e2e` (the build
 * with the fake auth, KP10), then `npx playwright test`, which serves that
 * build with vite preview. This config builds nothing itself. Every
 * /api/investors call is mocked (e2e/fixtures/api.ts); screenshots land in
 * e2e/screenshots/<project>/.
 */

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:4173/investors/",
    locale: "en-GB",
    timezoneId: "UTC",
    colorScheme: "light",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "phone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npx vite preview --outDir dist-e2e --port 4173 --strictPort",
    url: "http://localhost:4173/investors/",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
