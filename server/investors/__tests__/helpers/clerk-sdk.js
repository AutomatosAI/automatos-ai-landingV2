/**
 * Stands in for @clerk/backend in every root test: vitest.config.js aliases
 * the package to this file, so no test can load the real SDK or reach
 * Clerk's API (vi.mock is not enough: vitest 3 can hand a concurrent dynamic
 * import() the real module). auth.js imports the SDK lazily, so it gets this
 * module; tests set its behaviour here and call resetClerkSdk() between tests.
 */
import { vi } from "vitest";

/** Lets a test prove the alias is in force. */
export const IS_TEST_STUB = true;

const unset = (name) => async () => {
  throw new Error(`clerk-sdk stub: ${name} has no behaviour set in this test`);
};

export const verifyToken = vi.fn(unset("verifyToken"));
export const users = Object.freeze({ getUser: vi.fn(unset("users.getUser")) });
export const jwks = Object.freeze({ getJwks: vi.fn(unset("jwks.getJwks")) });
export const createClerkClient = vi.fn(() => ({ users, jwks }));

/** Clears calls and behaviour set by a test. */
export function resetClerkSdk() {
  verifyToken.mockReset().mockImplementation(unset("verifyToken"));
  users.getUser.mockReset().mockImplementation(unset("users.getUser"));
  jwks.getJwks.mockReset().mockImplementation(unset("jwks.getJwks"));
  createClerkClient.mockReset().mockImplementation(() => ({ users, jwks }));
}
