/**
 * GET /me and PUT /me (W1-07) through the portal's own apiRouter, over the
 * test database. Each test gets a fresh portal, so rate-limit counts never
 * carry over.
 */
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import {
  CHEQUE_SIZES,
  INVESTOR_TYPES,
  SAVE_LIMIT_PER_MINUTE,
  SOURCES,
  isLinkedInUrl,
} from "../routes/me.js";
import { ADA, ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { createTestDb } from "./helpers/test-db.js";

const ENV = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
  INVESTOR_ADMIN_CLERK_IDS: ADMIN.id,
});

/** What the form sends for Ada (KP5: invented). */
const PROFILE = Object.freeze({
  name: "Ada Example",
  firm: "Example Ventures",
  title: "Partner",
  investorType: "vc",
  chequeSize: "250k_1m",
  linkedinUrl: "https://www.linkedin.com/in/ada-example",
  country: "Ireland",
  source: "websummit",
  marketingOptIn: false,
});

/** @type {import("../db.js").Db} */
let db;
let app;
let alerts;
let logger;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(() => db.end());
beforeEach(async () => {
  alerts = { signup: vi.fn(), firstOpen: vi.fn() };
  logger = { warn: vi.fn(), error: vi.fn() };
  const portal = createInvestorsPortal({ env: ENV, deps: { logger, alerts, createDb: () => db, ...fakeAuthDeps() } });
  await portal.start();
  await db.query("DELETE FROM investors.investors");
  app = express().use("/api/investors", portal.apiRouter);
});

const getMe = (who = ADA) => request(app).get("/api/investors/me").set("Authorization", bearer(who.id));
const putMe = (body, who = ADA) => request(app).put("/api/investors/me").set("Authorization", bearer(who.id)).send(body);

async function adaRow() {
  const { rows } = await db.query("SELECT * FROM investors.investors WHERE clerk_user_id = $1", [ADA.id]);
  return rows[0];
}

/** @param {string} investorId */
async function completedEvents(investorId) {
  const { rows } = await db.query(
    "SELECT count(*) AS n FROM investors.events WHERE investor_id = $1 AND type = 'profile_completed'",
    [investorId],
  );
  return rows[0].n;
}

/** Lets a deferred alert hook run. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe("GET /me", () => {
  it("returns a new investor without the Clerk id, not admin, profile not complete", async () => {
    const res = await getMe();
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(false);
    expect(res.body.profileComplete).toBe(false);
    expect(res.body.investor).toMatchObject({ email: ADA.email, name: ADA.name, firm: null, marketingOptIn: false });
    expect(res.body.investor.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.investor).not.toHaveProperty("clerkUserId");
    expect(JSON.stringify(res.body)).not.toContain(ADA.id);
  });

  it("says isAdmin for a Clerk id in INVESTOR_ADMIN_CLERK_IDS", async () => {
    const res = await getMe(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(true);
  });

  it("says profileComplete once the profile is saved", async () => {
    await putMe(PROFILE);
    const res = await getMe();
    expect(res.body.profileComplete).toBe(true);
    expect(res.body.investor).toMatchObject({ firm: PROFILE.firm, investorType: "vc", source: "websummit" });
  });
});

describe("PUT /me: a valid save", () => {
  it("saves every field, answers like GET /me and completes the profile", async () => {
    const res = await putMe(PROFILE);
    expect(res.status).toBe(200);
    expect(res.body.profileComplete).toBe(true);
    expect(res.body.investor).toMatchObject({ ...PROFILE, email: ADA.email });
    expect(res.body.investor).not.toHaveProperty("clerkUserId");
    const row = await adaRow();
    expect(row).toMatchObject({
      name: PROFILE.name,
      firm: PROFILE.firm,
      title: PROFILE.title,
      investor_type: "vc",
      cheque_size: "250k_1m",
      linkedin_url: PROFILE.linkedinUrl,
      country: PROFILE.country,
      source: "websummit",
      marketing_opt_in: false,
      marketing_opt_in_at: null,
    });
    expect(row.profile_completed_at).toBeInstanceOf(Date);
  });

  it("trims text and stores blank or missing optional fields as null", async () => {
    const res = await putMe({
      ...PROFILE,
      name: "  Ada Example  ",
      firm: " Independent ",
      title: "   ",
      chequeSize: "",
      linkedinUrl: null,
      country: undefined,
    });
    expect(res.status).toBe(200);
    expect(await adaRow()).toMatchObject({
      name: "Ada Example",
      firm: "Independent",
      title: null,
      cheque_size: null,
      linkedin_url: null,
      country: null,
    });
  });

  it("writes profile_completed and calls the signup hook once, on the first save only", async () => {
    const first = await putMe(PROFILE);
    const completedAt = (await adaRow()).profile_completed_at;
    const second = await putMe({ ...PROFILE, firm: "Example Ventures II" });
    await settle();
    expect([first.status, second.status]).toEqual([200, 200]);
    const row = await adaRow();
    expect(row.firm).toBe("Example Ventures II");
    expect(row.profile_completed_at).toEqual(completedAt);
    expect(await completedEvents(row.id)).toBe(1);
    expect(alerts.signup).toHaveBeenCalledTimes(1);
    expect(alerts.signup).toHaveBeenCalledWith(expect.objectContaining({ id: row.id, email: ADA.email, firm: PROFILE.firm }));
  });

  it("answers 200 even when the signup hook throws, logging only the error's name", async () => {
    alerts.signup.mockImplementation(() => {
      throw new Error("smtp said no to ada@example.com");
    });
    const res = await putMe(PROFILE);
    await settle();
    expect(res.status).toBe(200);
    expect(logger.error).toHaveBeenCalledWith("[investors] alert 'signup' failed: Error");
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("ada@example.com");
  });

  it("takes identity only from the token: email, Clerk id, blocked and completion in the body are ignored", async () => {
    const other = await getMe(ADMIN);
    const res = await putMe({
      ...PROFILE,
      id: other.body.investor.id,
      clerkUserId: ADMIN.id,
      email: ADMIN.email,
      blocked: true,
      profileCompletedAt: "2000-01-01T00:00:00.000Z",
      isAdmin: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(false);
    const row = await adaRow();
    expect(row).toMatchObject({ clerk_user_id: ADA.id, email: ADA.email, blocked: false });
    expect(row.profile_completed_at.getFullYear()).toBeGreaterThan(2000);
    const admin = await db.query("SELECT firm FROM investors.investors WHERE clerk_user_id = $1", [ADMIN.id]);
    expect(admin.rows[0].firm).toBeNull();
  });
});

describe("PUT /me: marketing opt-in", () => {
  it("stamps marketing_opt_in_at when the opt-in turns true, and only then", async () => {
    await putMe(PROFILE);
    expect((await adaRow()).marketing_opt_in_at).toBeNull();
    await putMe({ ...PROFILE, marketingOptIn: true });
    const optedIn = await adaRow();
    expect(optedIn.marketing_opt_in).toBe(true);
    expect(optedIn.marketing_opt_in_at).toBeInstanceOf(Date);
    await putMe({ ...PROFILE, marketingOptIn: true, firm: "Example Ventures II" });
    expect((await adaRow()).marketing_opt_in_at).toEqual(optedIn.marketing_opt_in_at);
    await putMe(PROFILE);
    const optedOut = await adaRow();
    expect(optedOut.marketing_opt_in).toBe(false);
    expect(optedOut.marketing_opt_in_at).toEqual(optedIn.marketing_opt_in_at);
    await putMe({ ...PROFILE, marketingOptIn: true });
    expect((await adaRow()).marketing_opt_in_at.getTime()).toBeGreaterThan(optedIn.marketing_opt_in_at.getTime());
  });
});

describe("PUT /me: field errors", () => {
  const omit = (field) => Object.fromEntries(Object.entries(PROFILE).filter(([key]) => key !== field));
  it.each([
    ["name", undefined, "required"],
    ["name", "", "required"],
    ["name", "   ", "required"],
    ["name", "x".repeat(121), "too_long"],
    ["name", 42, "invalid"],
    ["name", "Ada\nExample", "invalid"],
    ["firm", undefined, "required"],
    ["firm", "", "required"],
    ["firm", "x".repeat(161), "too_long"],
    ["title", "x".repeat(121), "too_long"],
    ["title", ["Partner"], "invalid"],
    ["investorType", undefined, "required"],
    ["investorType", "", "required"],
    ["investorType", "hedge_fund", "invalid_option"],
    ["chequeSize", "huge", "invalid_option"],
    ["linkedinUrl", "not a url", "linkedin_url"],
    ["linkedinUrl", `https://www.linkedin.com/in/${"x".repeat(300)}`, "too_long"],
    ["country", "x".repeat(81), "too_long"],
    ["source", undefined, "required"],
    ["source", "billboard", "invalid_option"],
    ["marketingOptIn", undefined, "required"],
    ["marketingOptIn", "yes", "invalid"],
  ])("%s = %j is 400 {fields: {%s: %s}} and saves nothing", async (field, value, code) => {
    const body = value === undefined ? omit(field) : { ...PROFILE, [field]: value };
    const res = await putMe(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields: { [field]: code } });
    expect(await adaRow()).toMatchObject({ firm: null, profile_completed_at: null });
  });

  it("lists every bad field at once", async () => {
    const res = await putMe({ name: "", marketingOptIn: false });
    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ name: "required", firm: "required", investorType: "required", source: "required" });
  });

  it("answers 400 invalid for a body that is not an object", async () => {
    const res = await putMe([PROFILE]);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields: {} });
  });
});

describe("PUT /me: the LinkedIn address", () => {
  it.each([
    "https://www.linkedin.com/in/ada-example",
    "https://linkedin.com/in/ada-example",
    "https://ie.linkedin.com/in/ada-example/",
    "HTTPS://WWW.LINKEDIN.COM/in/ada-example",
  ])("accepts %s", (url) => {
    expect(isLinkedInUrl(url)).toBe(true);
  });

  it.each([
    "http://www.linkedin.com/in/ada-example",
    "https:www.linkedin.com/in/ada-example",
    "www.linkedin.com/in/ada-example",
    "javascript:alert(1)",
    "https://linkedin.com.example.org/in/ada",
    "https://notlinkedin.com/in/ada",
    "https://www.linkedin.com@example.org/in/ada",
    "https://ada:secret@www.linkedin.com/in/ada",
    "https://www.linkedin.com:8443/in/ada",
    "https://example.org/?next=https://www.linkedin.com/",
  ])("refuses %s", async (url) => {
    expect(isLinkedInUrl(url)).toBe(false);
    const res = await putMe({ ...PROFILE, linkedinUrl: url });
    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ linkedinUrl: "linkedin_url" });
  });

  it("stores the parsed address (host lower-cased)", async () => {
    await putMe({ ...PROFILE, linkedinUrl: "  HTTPS://WWW.LINKEDIN.COM/in/ada-example  " });
    expect((await adaRow()).linkedin_url).toBe("https://www.linkedin.com/in/ada-example");
  });
});

describe("PUT /me: limits", () => {
  it("answers 429 rate_limited on the 11th request in a minute, per investor (KP16)", async () => {
    expect(SAVE_LIMIT_PER_MINUTE).toBe(10);
    for (let i = 0; i < 10; i += 1) {
      const res = await putMe(i % 2 === 0 ? PROFILE : { ...PROFILE, firm: "" });
      expect(res.status).not.toBe(429);
    }
    const over = await putMe(PROFILE);
    expect(over.status).toBe(429);
    expect(over.body).toEqual({ error: "rate_limited" });
    expect((await putMe(PROFILE, ADMIN)).status).toBe(200);
    expect((await getMe()).status).toBe(200);
  });

  it("answers 413 for a body over 64 kB and 400 for malformed JSON", async () => {
    const big = await putMe({ ...PROFILE, title: "x".repeat(70 * 1024) });
    expect(big.status).toBe(413);
    const broken = await request(app)
      .put("/api/investors/me")
      .set("Authorization", bearer(ADA.id))
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(broken.status).toBe(400);
    expect(broken.body).toEqual({ error: "bad_request" });
  });

  it("reads no body before the guard: a malformed body without a token is 401", async () => {
    const res = await request(app).put("/api/investors/me").set("Content-Type", "application/json").send("{not json");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthenticated" });
  });
});

describe("the choice lists", () => {
  /** @param {string} column */
  async function checkValues(column) {
    const { rows } = await db.query(
      `SELECT pg_get_constraintdef(c.oid) AS def FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'investors' AND t.relname = 'investors' AND c.contype = 'c'`,
    );
    const def = rows.map((row) => row.def).find((text) => text.includes(`(${column} =`));
    return [...def.matchAll(/'([^']+)'::text/g)].map((match) => match[1]).sort();
  }

  it.each([
    ["investor_type", INVESTOR_TYPES],
    ["cheque_size", CHEQUE_SIZES],
    ["source", SOURCES],
  ])("match the %s CHECK constraint", async (column, values) => {
    expect(await checkValues(column)).toEqual([...values].sort());
  });
});
