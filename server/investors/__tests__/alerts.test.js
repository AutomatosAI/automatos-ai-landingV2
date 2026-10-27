/**
 * Admin alert emails (W1-18). createAlerts over the test database and a fake
 * transport: the claim in alerts_sent makes each alert one email, and the
 * HTML escapes what investors typed. Then the portal wired with them: one
 * email per sign-up across two profile saves, one per investor per document
 * across opens, a failed send leaves the answer as it was, and without
 * recipients or SMTP credentials no email and one warning. Every person,
 * firm, address and document is invented (KP5).
 */
import express from "express";
import { createTransport as createNodemailerTransport } from "nodemailer";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, firstOpenMessage, signupMessage } from "../alert-messages.js";
import { ALERT_BASE_URL, ALERT_FROM_NAME, alertsFromConfig, callAlert, createAlerts, NO_ALERTS } from "../alerts.js";
import { INVESTOR_COLUMNS, toInvestor } from "../auth.js";
import { readPortalConfig, SMTP_DEFAULTS } from "../config.js";
import { createInvestorsPortal } from "../index.js";
import { runMigrations } from "../migrate.js";
import { ADA, ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { fakeDocStore } from "./helpers/fake-doc-store.js";
import { insertDocument, insertInvestor } from "./helpers/investor-fixtures.js";
import { createTestDb } from "./helpers/test-db.js";

const SMTP_ENV = Object.freeze({
  INVESTOR_ALERT_EMAILS: "team@example.com, partners@example.com",
  SMTP_USER: "alerts@example.com",
  SMTP_PASS: "not-a-real-password",
});

const ENV = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
  INVESTOR_ADMIN_CLERK_IDS: ADMIN.id,
  ...SMTP_ENV,
});

const FROM = Object.freeze({ name: ALERT_FROM_NAME, address: SMTP_ENV.SMTP_USER });
const TO = ["team@example.com", "partners@example.com"];

const PROFILE = Object.freeze({
  name: "Ada Example",
  firm: "Example Ventures",
  investorType: "angel",
  chequeSize: "50k_250k",
  source: "websummit",
  marketingOptIn: false,
});

const SCRIPT = "<script>alert('x')</script>";
const SCRIPT_ESCAPED = "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;";

/** @type {import("../db.js").Db} */
let db;
let transport;
let logger;
beforeAll(async () => {
  db = await createTestDb();
  await runMigrations(db);
});
afterAll(() => db.end());
beforeEach(async () => {
  transport = { sendMail: vi.fn(async () => ({ messageId: "<fake@example.com>" })) };
  logger = { warn: vi.fn(), error: vi.fn() };
  await db.query("DELETE FROM investors.investors");
  await db.query("DELETE FROM investors.documents");
});

/** Lets deferred hooks run. */
const settle = () => new Promise((resolve) => setImmediate(resolve));
const sent = () => transport.sendMail.mock.calls.map(([message]) => message);

/** @param {string} id */
async function investorById(id) {
  const { rows } = await db.query(`SELECT ${INVESTOR_COLUMNS} FROM investors.investors WHERE id = $1`, [id]);
  return toInvestor(rows[0]);
}

async function alertRows() {
  const { rows } = await db.query("SELECT kind, document_id FROM investors.alerts_sent ORDER BY sent_at");
  return rows;
}

describe("createAlerts: one email per alert", () => {
  const alertsOver = () => createAlerts({ db, transport, to: TO, from: FROM });

  it("sends the sign-up email once, however often the hook runs", async () => {
    const id = await insertInvestor(db, { email: "ada@example.com", chequeSize: "250k_1m" });
    const ada = await investorById(id);
    const alerts = alertsOver();
    expect(await alerts.signup(ada)).toBe(true);
    expect(await Promise.all([alerts.signup(ada), alerts.signup(ada)])).toEqual([false, false]);
    expect(sent()).toHaveLength(1);
    const [message] = sent();
    expect(message).toMatchObject({ from: FROM, to: TO, subject: "New investor: Ada Example (Example Ventures)" });
    for (const line of [
      "Name: Ada Example",
      "Email: ada@example.com",
      "Firm: Example Ventures",
      "Type: Venture capital",
      "Cheque size: 250k to 1M",
      "Source: Web Summit",
      `${ALERT_BASE_URL}/investors/admin/investors/${id}`,
    ]) {
      expect(message.text).toContain(line);
    }
    expect(message.html).toContain(`<a href="https://automatos.app/investors/admin/investors/${id}">`);
    expect(await alertRows()).toEqual([{ kind: "signup", document_id: null }]);
  });

  it("sends the first-open email once per investor per document", async () => {
    const [adaId, bobId] = [await insertInvestor(db), await insertInvestor(db, { name: "Bob Example", firm: null })];
    const deck = { id: await insertDocument(db, { title: "Example deck" }), title: "Example deck" };
    const onePager = { id: await insertDocument(db, { title: "Example one-pager" }), title: "Example one-pager" };
    const [ada, bob] = [await investorById(adaId), await investorById(bobId)];
    const alerts = alertsOver();
    const results = [];
    for (const [who, doc] of [[ada, deck], [ada, deck], [ada, onePager], [bob, deck], [bob, deck]]) {
      results.push(await alerts.firstOpen(who, doc));
    }
    expect(results).toEqual([true, false, true, true, false]);
    expect(sent().map((message) => message.subject)).toEqual([
      "Ada Example (Example Ventures) opened Example deck",
      "Ada Example (Example Ventures) opened Example one-pager",
      "Bob Example opened Example deck",
    ]);
    expect(sent()[2].text).toContain(`${ALERT_BASE_URL}/investors/admin/investors/${bobId}`);
    expect(await alerts.signup(ada)).toBe(true);
  });

  it("rejects when the send fails, and never sends that alert again", async () => {
    const ada = await investorById(await insertInvestor(db));
    transport.sendMail.mockRejectedValueOnce(Object.assign(new Error("connect refused"), { code: "ECONNECTION" }));
    const alerts = alertsOver();
    await expect(alerts.signup(ada)).rejects.toMatchObject({ code: "ECONNECTION" });
    expect(await alerts.signup(ada)).toBe(false);
    expect(transport.sendMail).toHaveBeenCalledTimes(1);
  });

  it("escapes <script> in the name, firm and title in the HTML; the text and subject keep them as typed", async () => {
    const id = await insertInvestor(db, { name: SCRIPT, firm: `${SCRIPT} & "Co"` });
    const investor = await investorById(id);
    const doc = { id: await insertDocument(db), title: `<img src=x onerror="alert(1)">` };
    const alerts = alertsOver();
    await alerts.signup(investor);
    await alerts.firstOpen(investor, doc);
    for (const message of sent()) {
      expect(message.html).not.toMatch(/<script|<img/i);
      expect(message.html).toContain(SCRIPT_ESCAPED);
      expect(message.html).toContain(`${SCRIPT_ESCAPED} &amp; &quot;Co&quot;`);
      expect(message.text).toContain(`Name: ${SCRIPT}`);
    }
    expect(sent()[0].subject).toBe(`New investor: ${SCRIPT} (${SCRIPT} & "Co")`);
    expect(sent()[1].html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});

describe("the alert messages", () => {
  const investor = Object.freeze({
    id: "00000000-0000-4000-8000-000000000001",
    email: "ada@example.com",
    name: null,
    firm: null,
    investorType: null,
    chequeSize: null,
    source: null,
  });
  const options = { baseUrl: ALERT_BASE_URL };

  it("escapes the five HTML characters", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;");
  });

  it("names the investor by email when the profile has no name, and says what was not given", () => {
    const signup = signupMessage(/** @type {any} */ (investor), options);
    expect(signup.subject).toBe("New investor: ada@example.com");
    expect(signup.text).toContain("Firm: Not given");
    expect(signup.text).toContain("Cheque size: Not given");
    const opened = firstOpenMessage(/** @type {any} */ (investor), { id: "d", title: "Example deck" }, options);
    expect(opened.subject).toBe("ada@example.com opened Example deck");
  });

  it("keeps every value on one line, so nothing can add a header or a line", () => {
    const forged = { ...investor, name: "Ada\r\nBcc: someone@example.com", firm: "Example\nLink: https://evil.example" };
    const message = signupMessage(/** @type {any} */ (forged), options);
    expect(message.subject).toBe("New investor: Ada Bcc: someone@example.com (Example Link: https://evil.example)");
    expect(message.text).toContain("Name: Ada Bcc: someone@example.com");
    expect(message.text.split("\n").filter((line) => line.startsWith("Link"))).toEqual([]);
  });
});

describe("callAlert", () => {
  it("runs the hook only after the response path (setImmediate)", async () => {
    const hook = vi.fn();
    const done = callAlert(logger, "signup", hook);
    await Promise.resolve();
    expect(hook).not.toHaveBeenCalled();
    await done;
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it("logs a failure by name and code only, and never rejects", async () => {
    const failure = Object.assign(new Error("535 rejected alerts@example.com"), { code: "EAUTH" });
    await expect(callAlert(logger, "firstOpen", () => Promise.reject(failure))).resolves.toBeUndefined();
    const odd = Object.assign(new Error("x"), { code: "550 no such user ada@example.com" });
    await callAlert(logger, "signup", () => Promise.reject(odd));
    expect(logger.error.mock.calls).toEqual([
      ["[investors] alert 'firstOpen' failed: Error (EAUTH)"],
      ["[investors] alert 'signup' failed: Error"],
    ]);
  });
});

describe("alertsFromConfig", () => {
  const settings = (env) => readPortalConfig(env).alerts;

  it("builds the contact form's transport (same variables, same defaults) and sends from SMTP_USER", async () => {
    const createTransport = vi.fn(() => transport);
    const mail = alertsFromConfig(settings(SMTP_ENV), { db, createTransport });
    expect(mail.off).toBeNull();
    expect(createTransport).toHaveBeenCalledWith({
      host: SMTP_DEFAULTS.host,
      port: SMTP_DEFAULTS.port,
      secure: true,
      auth: { user: SMTP_ENV.SMTP_USER, pass: SMTP_ENV.SMTP_PASS },
    });
    const custom = { ...SMTP_ENV, SMTP_HOST: "smtp.example.com", SMTP_PORT: "2465" };
    alertsFromConfig(settings(custom), { db, createTransport });
    expect(createTransport).toHaveBeenLastCalledWith(expect.objectContaining({ host: "smtp.example.com", port: 2465 }));
  });

  it.each([
    ["no recipients", { ...SMTP_ENV, INVESTOR_ALERT_EMAILS: " , " }, "INVESTOR_ALERT_EMAILS is empty"],
    ["no SMTP_USER", { ...SMTP_ENV, SMTP_USER: "" }, "SMTP_USER or SMTP_PASS is unset"],
    ["no SMTP_PASS", { ...SMTP_ENV, SMTP_PASS: undefined }, "SMTP_USER or SMTP_PASS is unset"],
  ])("is NO_ALERTS with %s, building no transport", (_label, env, off) => {
    const createTransport = vi.fn(() => transport);
    expect(alertsFromConfig(settings(env), { db, createTransport })).toEqual({ alerts: NO_ALERTS, off });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("hands nodemailer a message it can build (stream transport: nothing leaves the process)", async () => {
    const raw = [];
    const createTransport = () => {
      const stream = createNodemailerTransport({ streamTransport: true, buffer: true, newline: "unix" });
      return {
        sendMail: async (message) => {
          const info = await stream.sendMail(message);
          raw.push(info.message.toString("utf8"));
          return info;
        },
      };
    };
    const { alerts } = alertsFromConfig(settings(SMTP_ENV), { db, createTransport });
    const ada = await investorById(await insertInvestor(db));
    expect(await alerts.signup(ada)).toBe(true);
    expect(await alerts.firstOpen(ada, { id: await insertDocument(db), title: "Example deck" })).toBe(true);
    expect(raw).toHaveLength(2);
    expect(raw[0]).toMatch(/^From: Automatos Investor Portal <alerts@example\.com>$/m);
    expect(raw[0]).toMatch(/^To: team@example\.com, partners@example\.com$/m);
    expect(raw[0]).toMatch(/^Subject: New investor: Ada Example \(Example Ventures\)$/m);
    expect(raw[0]).toMatch(/^Content-Type: multipart\/alternative;/m);
    expect(raw[1]).toMatch(/^Subject: Ada Example \(Example Ventures\) opened Example deck$/m);
  });

  it("is NO_ALERTS, never a throw, when the transport cannot be built", () => {
    const createTransport = () => {
      throw Object.assign(new TypeError("bad option"), { code: "EINVALID" });
    };
    const mail = alertsFromConfig(settings(SMTP_ENV), { db, createTransport });
    expect(mail).toEqual({ alerts: NO_ALERTS, off: "the SMTP transport could not be built: TypeError (EINVALID)" });
  });
});

describe("the portal's alert emails", () => {
  let files;
  let createTransport;

  /** @param {Record<string, string | undefined>} env */
  async function mountPortal(env = ENV) {
    const portal = createInvestorsPortal({
      env,
      deps: { logger, createDb: () => db, createTransport, docStore: files.store, ...fakeAuthDeps() },
    });
    await portal.start();
    return { portal, app: express().use("/api/investors", portal.apiRouter) };
  }
  const api = (app, method, path, who = ADA) =>
    request(app)[method](`/api/investors${path}`).set("Authorization", bearer(who.id));
  /** @param {string} clerkUserId */
  const idOf = async (clerkUserId) =>
    (await db.query("SELECT id FROM investors.investors WHERE clerk_user_id = $1", [clerkUserId])).rows[0].id;

  beforeEach(() => {
    files = fakeDocStore();
    createTransport = vi.fn(() => transport);
  });

  it("sends one email per sign-up across two profile saves", async () => {
    const { app } = await mountPortal();
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect((await api(app, "put", "/me").send(PROFILE)).status).toBe(200);
    await vi.waitFor(() => expect(transport.sendMail).toHaveBeenCalledTimes(1));
    expect((await api(app, "put", "/me").send({ ...PROFILE, firm: "Example Ventures II" })).status).toBe(200);
    await settle();
    expect(sent()).toHaveLength(1);
    expect(sent()[0]).toMatchObject({ from: FROM, to: TO, subject: "New investor: Ada Example (Example Ventures)" });
    expect(sent()[0].text).toContain(`/investors/admin/investors/${await idOf(ADA.id)}`);
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining("alert emails off"));
  });

  it("sends one first-open email per investor per document across repeated opens, none for downloads", async () => {
    const { app } = await mountPortal();
    const deck = await insertDocument(db, { title: "Example deck", alertOnFirstOpen: true });
    const link = (mode, who) => api(app, "post", `/documents/${deck}/link`, who).send({ mode });
    expect((await link("download", ADA)).status).toBe(200);
    for (let i = 0; i < 3; i += 1) expect((await link("inline", ADA)).status).toBe(200);
    await vi.waitFor(() => expect(transport.sendMail).toHaveBeenCalledTimes(1));
    await link("inline", ADMIN);
    await vi.waitFor(() => expect(transport.sendMail).toHaveBeenCalledTimes(2));
    await link("inline", ADMIN);
    await settle();
    expect(sent().map((message) => message.subject)).toEqual([
      "Ada Example opened Example deck",
      "Admin Example opened Example deck",
    ]);
  });

  it("escapes <script> typed into the profile form in the sign-up email", async () => {
    const { app } = await mountPortal();
    await api(app, "put", "/me").send({ ...PROFILE, name: SCRIPT, firm: `${SCRIPT} Ventures` });
    await vi.waitFor(() => expect(transport.sendMail).toHaveBeenCalledTimes(1));
    expect(sent()[0].html).not.toContain("<script");
    expect(sent()[0].html).toContain(`<td>${SCRIPT_ESCAPED}</td>`);
    expect(sent()[0].html).toContain(`<td>${SCRIPT_ESCAPED} Ventures</td>`);
  });

  it("answers as usual when the send fails, logging no address or email body", async () => {
    transport.sendMail.mockRejectedValue(Object.assign(new Error(`535 rejected ${SMTP_ENV.SMTP_USER}`), { code: "EAUTH" }));
    const { app } = await mountPortal();
    const saved = await api(app, "put", "/me").send(PROFILE);
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual((await api(app, "get", "/me")).body);
    expect(saved.body).toMatchObject({ profileComplete: true, investor: { name: PROFILE.name } });
    const deck = await insertDocument(db, { alertOnFirstOpen: true });
    const opened = await api(app, "post", `/documents/${deck}/link`).send({ mode: "inline" });
    expect(opened.status).toBe(200);
    expect(opened.body).toEqual({ url: expect.stringContaining("fake-get"), expiresIn: 300 });
    await vi.waitFor(() => expect(logger.error).toHaveBeenCalledTimes(2));
    expect(logger.error.mock.calls).toEqual([
      ["[investors] alert 'signup' failed: Error (EAUTH)"],
      ["[investors] alert 'firstOpen' failed: Error (EAUTH)"],
    ]);
    expect(JSON.stringify(logger.error.mock.calls)).not.toMatch(/example\.com|Ada Example/);
  });

  it.each([
    ["no recipients", { ...ENV, INVESTOR_ALERT_EMAILS: undefined }, "INVESTOR_ALERT_EMAILS is empty"],
    ["no SMTP_USER", { ...ENV, SMTP_USER: undefined }, "SMTP_USER or SMTP_PASS is unset"],
  ])("sends nothing with %s, and warns once at start", async (_label, env, off) => {
    const { portal, app } = await mountPortal(env);
    await portal.start();
    expect(logger.warn.mock.calls).toEqual([[`[investors] alert emails off: ${off}`]]);
    expect((await api(app, "put", "/me").send(PROFILE)).status).toBe(200);
    await settle();
    expect(createTransport).not.toHaveBeenCalled();
    expect(await alertRows()).toEqual([]);
  });
});
