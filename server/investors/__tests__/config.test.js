import { afterEach, describe, expect, it, vi } from "vitest";
import { REQUIRED_VARS, SMTP_DEFAULTS, parseList, readPortalConfig } from "../config.js";

const COMPLETE = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake",
});

const S3_COMPLETE = Object.freeze({
  INVESTOR_DOCS_BUCKET: "example-bucket",
  INVESTOR_DOCS_REGION: "eu-west-1",
  INVESTOR_DOCS_ACCESS_KEY_ID: "fake-access-key-id",
  INVESTOR_DOCS_SECRET_ACCESS_KEY: "fake-secret",
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readPortalConfig: required variables", () => {
  it("lists every unset required variable by name, in order", () => {
    const config = readPortalConfig({});
    expect(config.missing).toEqual([
      "INVESTORS_DATABASE_URL",
      "CLERK_SECRET_KEY",
      "CLERK_PUBLISHABLE_KEY",
    ]);
    expect(config.missing).toEqual(REQUIRED_VARS);
    expect(config.db.url).toBeNull();
    expect(config.clerk.secretKey).toBeNull();
    expect(config.clerk.publishableKey).toBeNull();
  });

  it("lists only the variables that are unset", () => {
    const config = readPortalConfig({ ...COMPLETE, CLERK_SECRET_KEY: undefined });
    expect(config.missing).toEqual(["CLERK_SECRET_KEY"]);
  });

  it("treats blank values as unset", () => {
    const config = readPortalConfig({ ...COMPLETE, INVESTORS_DATABASE_URL: "   " });
    expect(config.missing).toEqual(["INVESTORS_DATABASE_URL"]);
  });

  it("has nothing missing when all are set, and reads the values trimmed", () => {
    const config = readPortalConfig({ ...COMPLETE, CLERK_PUBLISHABLE_KEY: " pk_test_fake\n" });
    expect(config.missing).toEqual([]);
    expect(config.db.url).toBe(COMPLETE.INVESTORS_DATABASE_URL);
    expect(config.clerk.secretKey).toBe("sk_test_fake");
    expect(config.clerk.publishableKey).toBe("pk_test_fake");
  });

  it("reads only the env it is given, never process.env", () => {
    vi.stubEnv("INVESTORS_DATABASE_URL", "postgres://from-process-env@localhost/x");
    expect(readPortalConfig({}).missing).toContain("INVESTORS_DATABASE_URL");
  });

  it("accepts a null or absent env", () => {
    expect(readPortalConfig(null).missing).toEqual(REQUIRED_VARS);
    expect(readPortalConfig().missing).toEqual(REQUIRED_VARS);
  });
});

describe("readPortalConfig: S3", () => {
  it("is null when no S3 variable is set", () => {
    expect(readPortalConfig(COMPLETE).s3).toBeNull();
  });

  it.each(Object.keys(S3_COMPLETE))("is null when %s is missing", (name) => {
    expect(readPortalConfig({ ...COMPLETE, ...S3_COMPLETE, [name]: "" }).s3).toBeNull();
  });

  it("carries all four values when all are set", () => {
    expect(readPortalConfig({ ...COMPLETE, ...S3_COMPLETE }).s3).toEqual({
      bucket: "example-bucket",
      region: "eu-west-1",
      accessKeyId: "fake-access-key-id",
      secretAccessKey: "fake-secret",
    });
  });

  it("does not make S3 a required variable", () => {
    expect(readPortalConfig(COMPLETE).missing).toEqual([]);
  });
});

describe("readPortalConfig: lists", () => {
  it("parses admins trimmed, dropping empty entries", () => {
    const config = readPortalConfig({ INVESTOR_ADMIN_CLERK_IDS: " user_a , ,user_b,,user_a, " });
    expect([...config.admins]).toEqual(["user_a", "user_b"]);
    expect(config.admins.has("user_b")).toBe(true);
    expect(config.admins.has("")).toBe(false);
  });

  it("has no admins when the variable is unset", () => {
    expect(readPortalConfig({}).admins.size).toBe(0);
  });

  it("defaults authorized parties to https://automatos.app", () => {
    expect(readPortalConfig({}).clerk.authorizedParties).toEqual(["https://automatos.app"]);
    expect(readPortalConfig({ INVESTORS_AUTHORIZED_PARTIES: " , " }).clerk.authorizedParties).toEqual([
      "https://automatos.app",
    ]);
  });

  it("parses authorized parties from INVESTORS_AUTHORIZED_PARTIES", () => {
    const config = readPortalConfig({
      INVESTORS_AUTHORIZED_PARTIES: "https://automatos.app, https://staging.example.com",
    });
    expect(config.clerk.authorizedParties).toEqual(["https://automatos.app", "https://staging.example.com"]);
  });

  it("parses alert recipients", () => {
    expect(readPortalConfig({ INVESTOR_ALERT_EMAILS: "a@example.com, b@example.com," }).alerts.to).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
    expect(readPortalConfig({}).alerts.to).toEqual([]);
  });

  it("reads the contact form's SMTP settings with its defaults, and null without a user and a password", () => {
    const smtp = { SMTP_USER: "alerts@example.com", SMTP_PASS: " not-a-real-password " };
    expect(readPortalConfig(smtp).alerts.smtp).toEqual({
      host: SMTP_DEFAULTS.host,
      port: SMTP_DEFAULTS.port,
      user: "alerts@example.com",
      pass: " not-a-real-password ",
    });
    expect(SMTP_DEFAULTS).toEqual({ host: "mail.privateemail.com", port: 465 });
    expect(readPortalConfig({ ...smtp, SMTP_HOST: "smtp.example.com", SMTP_PORT: "587" }).alerts.smtp).toMatchObject({
      host: "smtp.example.com",
      port: 587,
    });
    expect(readPortalConfig({ ...smtp, SMTP_PORT: "not-a-port" }).alerts.smtp?.port).toBe(SMTP_DEFAULTS.port);
    expect(readPortalConfig({ SMTP_USER: "alerts@example.com" }).alerts.smtp).toBeNull();
    expect(readPortalConfig({ SMTP_PASS: "not-a-real-password" }).alerts.smtp).toBeNull();
    expect(readPortalConfig({}).alerts.smtp).toBeNull();
  });

  it("parseList handles undefined and returns a frozen array", () => {
    expect(parseList(undefined)).toEqual([]);
    expect(Object.isFrozen(parseList("a,b"))).toBe(true);
  });
});

describe("readPortalConfig: frozen", () => {
  const config = readPortalConfig({
    ...COMPLETE,
    ...S3_COMPLETE,
    INVESTOR_ADMIN_CLERK_IDS: "user_a",
    INVESTOR_ALERT_EMAILS: "a@example.com",
    SMTP_USER: "alerts@example.com",
    SMTP_PASS: "not-a-real-password",
  });

  it("freezes the config and every nested object and array", () => {
    expect(Object.isFrozen(config)).toBe(true);
    const parts = [config.db, config.clerk, config.clerk.authorizedParties, config.s3, config.alerts, config.alerts.smtp];
    for (const part of parts) {
      expect(Object.isFrozen(part)).toBe(true);
    }
    expect(Object.isFrozen(config.alerts.to)).toBe(true);
    expect(Object.isFrozen(config.missing)).toBe(true);
  });

  it("refuses writes", () => {
    expect(() => {
      config.db = { url: "x" };
    }).toThrow(TypeError);
    expect(() => config.clerk.authorizedParties.push("https://evil.example")).toThrow(TypeError);
    expect(() => config.missing.push("X")).toThrow(TypeError);
  });

  it("refuses changes to the admin set", () => {
    expect(() => config.admins.add("user_evil")).toThrow(TypeError);
    expect(() => config.admins.delete("user_a")).toThrow(TypeError);
    expect(() => config.admins.clear()).toThrow(TypeError);
    expect([...config.admins]).toEqual(["user_a"]);
  });

  it("returns a new config per call (the default parties are shared but frozen)", () => {
    const a = readPortalConfig({});
    const b = readPortalConfig({});
    expect(a).not.toBe(b);
    expect(Object.isFrozen(a.clerk.authorizedParties)).toBe(true);
  });
});
