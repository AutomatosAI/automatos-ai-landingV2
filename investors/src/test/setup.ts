import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// findBy*/waitFor give up after this long. The default (1 s) is too short for a
// lazily loaded route when the whole suite runs on a busy machine: the admin
// document manager test failed 1 in 3 full runs at load ~20 while passing alone.
const ASYNC_UTIL_TIMEOUT_MS = 5_000;

configure({ asyncUtilTimeout: ASYNC_UTIL_TIMEOUT_MS });

afterEach(() => {
  cleanup();
});
