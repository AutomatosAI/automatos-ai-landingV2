import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
      setupFiles: ["./src/test/setup.ts"],
      // Room for several findBy*/waitFor calls at src/test/setup.ts's 5 s each.
      testTimeout: 20_000,
    },
  }),
);
