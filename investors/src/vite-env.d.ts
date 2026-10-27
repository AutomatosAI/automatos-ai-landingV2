/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" only in the e2e build (package.json build:e2e): swaps Clerk for the fake auth (KP10). */
  readonly VITE_INVESTORS_E2E?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
