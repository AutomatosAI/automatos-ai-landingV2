import { afterEach, describe, expect, it } from "vitest";

import { isClerkPublishableKey, parseAppConfig, readAppConfig } from "../config";

// Invented keys in Clerk's format: the prefix, then base64('<host>$').
const TEST_KEY = `pk_test_${btoa("example.clerk.accounts.dev$")}`;
const LIVE_KEY = `pk_live_${btoa("clerk.example.com$")}`;

describe("isClerkPublishableKey", () => {
  it("accepts test and live keys in Clerk's format", () => {
    expect(isClerkPublishableKey(TEST_KEY)).toBe(true);
    expect(isClerkPublishableKey(LIVE_KEY)).toBe(true);
  });

  it("rejects anything ClerkProvider would throw on", () => {
    expect(isClerkPublishableKey("")).toBe(false);
    expect(isClerkPublishableKey("${CLERK_PUBLISHABLE_KEY}")).toBe(false);
    expect(isClerkPublishableKey(`sk_test_${btoa("example.clerk.accounts.dev$")}`)).toBe(false);
    expect(isClerkPublishableKey("pk_test_")).toBe(false);
    expect(isClerkPublishableKey("pk_test_!!!not-base64")).toBe(false);
    expect(isClerkPublishableKey(`pk_test_${btoa("example.clerk.accounts.dev")}`)).toBe(false);
    expect(isClerkPublishableKey(`pk_test_${btoa("localhost$")}`)).toBe(false);
    expect(isClerkPublishableKey(`pk_test_${btoa("a$b.example.com$")}`)).toBe(false);
    expect(isClerkPublishableKey(`pk_test_extra_${btoa("example.clerk.accounts.dev$")}`)).toBe(false);
  });
});

describe("parseAppConfig", () => {
  it("returns the key from a hydrated config", () => {
    const config = parseAppConfig({ publicKey: "", clerkPublishableKey: TEST_KEY, apiBase: "https://api.example.com" });
    expect(config).toEqual({ clerkPublishableKey: TEST_KEY });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("trims whitespace around the key", () => {
    expect(parseAppConfig({ clerkPublishableKey: `  ${LIVE_KEY}\n` }).clerkPublishableKey).toBe(LIVE_KEY);
  });

  it.each([
    ["no config at all", undefined],
    ["a config that is not an object", "pk_test_x"],
    ["null", null],
    ["a config without the key", { publicKey: "ak_pub_x" }],
    ["an empty key (env unset)", { clerkPublishableKey: "" }],
    ["the template's placeholder left unhydrated", { clerkPublishableKey: "${CLERK_PUBLISHABLE_KEY}" }],
    ["a key that is not a string", { clerkPublishableKey: 42 }],
    ["a malformed key", { clerkPublishableKey: "pk_test_nope" }],
  ])("treats %s as no key (signed-out-only mode)", (_label, raw) => {
    expect(parseAppConfig(raw)).toEqual({ clerkPublishableKey: null });
  });
});

describe("readAppConfig", () => {
  afterEach(() => {
    delete window.AUTOMATOS_CONFIG;
  });

  it("reads window.AUTOMATOS_CONFIG, written by /_config.js", () => {
    window.AUTOMATOS_CONFIG = { clerkPublishableKey: TEST_KEY };
    expect(readAppConfig().clerkPublishableKey).toBe(TEST_KEY);
  });

  it("has no key when /_config.js did not load", () => {
    expect(readAppConfig().clerkPublishableKey).toBeNull();
  });
});
