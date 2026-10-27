import { describe, expect, it } from "vitest";

import { DEFAULT_FAKE_SESSION, fakeAuthState, fakeToken, parseFakeSession } from "../fake-session";

describe("parseFakeSession", () => {
  it("reads a stored session", () => {
    const session = parseFakeSession(JSON.stringify({ userId: "user_e2e_ada", email: "ada@example.com" }));
    expect(session).toEqual({ userId: "user_e2e_ada", email: "ada@example.com" });
    expect(Object.isFrozen(session)).toBe(true);
  });

  it("drops unknown fields", () => {
    expect(parseFakeSession(JSON.stringify({ userId: "u", email: "a@example.com", isAdmin: true }))).toEqual({
      userId: "u",
      email: "a@example.com",
    });
  });

  it.each([
    ["nothing stored", null],
    ["not JSON", "{nope"],
    ["no user id", JSON.stringify({ email: "a@example.com" })],
    ["an empty user id", JSON.stringify({ userId: "", email: "a@example.com" })],
    ["a bad email", JSON.stringify({ userId: "u", email: "not-an-email" })],
    ["a JSON string", JSON.stringify("user_e2e_ada")],
  ])("is signed out for %s", (_label, raw) => {
    expect(parseFakeSession(raw)).toBeNull();
  });
});

describe("fakeAuthState", () => {
  it("maps a session to signed in and none to signed out", () => {
    expect(fakeAuthState(DEFAULT_FAKE_SESSION)).toEqual({
      status: "signed_in",
      userId: DEFAULT_FAKE_SESSION.userId,
      email: DEFAULT_FAKE_SESSION.email,
    });
    expect(fakeAuthState(null)).toEqual({ status: "signed_out" });
  });
});

describe("fakeToken", () => {
  it("is a recognisable stand-in, never a real token", () => {
    expect(fakeToken(DEFAULT_FAKE_SESSION)).toBe("e2e.user_e2e_ada");
  });
});
