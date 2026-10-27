/**
 * Which provider the seam uses (KP10). Only `npm run build:e2e` sets
 * VITE_INVESTORS_E2E=1; vite replaces the flag at build time, so the
 * production build folds this to "clerk" and drops the fake provider.
 */
export const AUTH_MODE: "clerk" | "fake" = import.meta.env.VITE_INVESTORS_E2E === "1" ? "fake" : "clerk";
