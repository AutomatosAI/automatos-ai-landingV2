/**
 * A fake Clerk for tests (KP9, KP10: the server has no fake verifier outside
 * tests). tokenFor() mints an unsigned test token carrying claims; the fake
 * verifier accepts only those, so any other string is a rejected token. The
 * people are invented (KP5).
 */
import { vi } from "vitest";

const PREFIX = "test-token.";

export const ADA = Object.freeze({ id: "user_ada", email: "ada@example.com", name: "Ada Example" });
export const ADMIN = Object.freeze({ id: "user_admin", email: "admin@example.com", name: "Admin Example" });
export const NO_EMAIL = Object.freeze({ id: "user_phone_only", email: null, name: null });

/**
 * @param {string} sub
 * @param {Record<string, unknown>} [claims]
 */
export function tokenFor(sub, claims = {}) {
  return PREFIX + Buffer.from(JSON.stringify({ sub, ...claims })).toString("base64url");
}

/** @param {string} sub */
export const bearer = (sub, claims) => `Bearer ${tokenFor(sub, claims)}`;

/** Rejects like Clerk: an error carrying a `reason`. */
function rejected() {
  return Object.assign(new Error("Invalid JWT form (reason=token-invalid)"), {
    name: "TokenVerificationError",
    reason: "token-invalid",
  });
}

export function fakeVerifier() {
  return vi.fn(async (token) => {
    if (typeof token !== "string" || !token.startsWith(PREFIX)) throw rejected();
    try {
      return JSON.parse(Buffer.from(token.slice(PREFIX.length), "base64url").toString("utf8"));
    } catch {
      throw rejected();
    }
  });
}

/** @param {Readonly<{id: string, email: string | null, name: string | null}>[]} [people] */
export function fakeUserLookup(people = [ADA, ADMIN, NO_EMAIL]) {
  const byId = new Map(people.map((person) => [person.id, person]));
  return vi.fn(async (clerkUserId) => {
    const person = byId.get(clerkUserId);
    return Object.freeze({
      email: person ? person.email : `${clerkUserId}@example.com`,
      name: person ? person.name : null,
    });
  });
}

/** The deps a ready portal needs to authenticate test requests. */
export function fakeAuthDeps() {
  return { verifier: fakeVerifier(), userLookup: fakeUserLookup() };
}
