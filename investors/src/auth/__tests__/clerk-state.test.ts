import { describe, expect, it } from "vitest";

import { clerkAppearance, deriveClerkState, returnPath, type ClerkSnapshot } from "../clerk-state";

const READY: ClerkSnapshot = {
  clerkStatus: "ready",
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  email: null,
};

describe("deriveClerkState", () => {
  it("is unavailable once clerk-js failed to load, whatever else it says", () => {
    expect(deriveClerkState({ ...READY, clerkStatus: "error", isLoaded: false })).toEqual({ status: "unavailable" });
    expect(deriveClerkState({ ...READY, clerkStatus: "error" })).toEqual({ status: "unavailable" });
  });

  it("is loading until Clerk has loaded", () => {
    expect(deriveClerkState({ ...READY, clerkStatus: "loading", isLoaded: false, isSignedIn: undefined })).toEqual({
      status: "loading",
    });
  });

  it("is signed out when loaded without a session", () => {
    expect(deriveClerkState(READY)).toEqual({ status: "signed_out" });
    expect(deriveClerkState({ ...READY, isSignedIn: true, userId: null })).toEqual({ status: "signed_out" });
  });

  it("is signed in with the user id and primary email", () => {
    const state = deriveClerkState({ ...READY, isSignedIn: true, userId: "user_ada", email: "ada@example.com" });
    expect(state).toEqual({ status: "signed_in", userId: "user_ada", email: "ada@example.com" });
    expect(Object.isFrozen(state)).toBe(true);
  });

  it("keeps working when Clerk is degraded", () => {
    expect(
      deriveClerkState({ ...READY, clerkStatus: "degraded", isSignedIn: true, userId: "user_ada", email: undefined }),
    ).toEqual({ status: "signed_in", userId: "user_ada", email: null });
  });
});

describe("returnPath", () => {
  it("returns to the app page the visitor was on", () => {
    expect(returnPath({ pathname: "/investors", search: "" })).toBe("/investors");
    expect(returnPath({ pathname: "/investors/documents/abc", search: "?page=2" })).toBe("/investors/documents/abc?page=2");
  });

  it("never sends the visitor outside the app", () => {
    expect(returnPath({ pathname: "/", search: "" })).toBe("/investors");
    expect(returnPath({ pathname: "/investorsx", search: "?a=1" })).toBe("/investors");
    expect(returnPath({ pathname: "/privacy", search: "" })).toBe("/investors");
  });
});

describe("clerkAppearance", () => {
  it("uses the site's square corners and type in both moods", () => {
    for (const mood of ["bone", "pitch"] as const) {
      const { variables } = clerkAppearance(mood);
      expect(variables.borderRadius).toBe("2px");
      expect(variables.fontFamily).toContain("Geist");
    }
  });

  it("follows the mood's colours", () => {
    expect(clerkAppearance("bone").variables.colorBackground).toBe("#F2EDE4");
    expect(clerkAppearance("pitch").variables.colorBackground).toBe("#161C19");
    expect(clerkAppearance("pitch").variables.colorForeground).toBe("#EFE9DD");
  });
});
