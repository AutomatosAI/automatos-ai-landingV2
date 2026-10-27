import { describe, expect, it } from "vitest";

import { ApiError } from "../errors";
import { landingRedirect, meErrorScreen, meQueryKey, meSchema, type Me } from "../me";

const ME: Me = {
  investor: { id: "00000000-0000-4000-8000-000000000001", email: "ada@example.com", name: "Ada Example" },
  isAdmin: false,
  profileComplete: true,
};

describe("landingRedirect", () => {
  it("sends an investor without a profile to the profile form from any page", () => {
    const incomplete = { ...ME, profileComplete: false };
    expect(landingRedirect(incomplete, "/")).toBe("/profile");
    expect(landingRedirect(incomplete, "/documents/abc")).toBe("/profile");
    expect(landingRedirect(incomplete, "/profile")).toBeNull();
  });

  it("lets an investor with a profile go anywhere, the profile form included", () => {
    expect(landingRedirect(ME, "/")).toBeNull();
    expect(landingRedirect(ME, "/documents")).toBeNull();
    expect(landingRedirect(ME, "/profile")).toBeNull();
  });
});

describe("meErrorScreen", () => {
  it("shows the unavailable screen for a 404 (no /me route yet) and a 503", () => {
    expect(meErrorScreen(new ApiError({ kind: "not_found", status: 404 }))).toBe("unavailable");
    expect(meErrorScreen(new ApiError({ kind: "unavailable", status: 503 }))).toBe("unavailable");
  });

  it("keeps the other screens", () => {
    expect(meErrorScreen(new ApiError({ kind: "blocked", status: 403 }))).toBe("blocked");
    expect(meErrorScreen(new ApiError({ kind: "unauthenticated", status: 401 }))).toBe("sign_in");
    expect(meErrorScreen(new Error("boom"))).toBe("error");
  });
});

describe("meSchema", () => {
  it("parses the server's answer and drops what the app does not use", () => {
    const parsed = meSchema.parse({ ...ME, investor: { ...ME.investor, firm: "Example Ventures" } });
    expect(parsed).toEqual(ME);
  });

  it("rejects an answer without the profile flag", () => {
    expect(meSchema.safeParse({ investor: ME.investor, isAdmin: false }).success).toBe(false);
  });
});

describe("meQueryKey", () => {
  it("is per Clerk user", () => {
    expect(meQueryKey("user_a")).not.toEqual(meQueryKey("user_b"));
  });
});
