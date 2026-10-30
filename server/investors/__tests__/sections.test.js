/**
 * Portal sections (W2-01) through the portal's own apiRouter, over the test
 * database: the four rows 002_sections_seed.sql seeds and the founder_card
 * row 005_founder_card_section.sql seeds (PRD-003 US-305), each kept on a
 * re-run, investors reading only the published ones, the admin's list,
 * read and save round-trip with updated_by from the token, validation, the
 * 404s and the admin gate. The route-coverage test walks these routes too.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvestorsPortal } from "../index.js";
import { MIGRATIONS_DIR } from "../migrate.js";
import { SECTION_LIMITS } from "../routes/sections.js";
import { ADA, ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { createTestDb } from "./helpers/test-db.js";

const ENV = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
  INVESTOR_ADMIN_CLERK_IDS: ADMIN.id,
});

const SEED_FILE = "002_sections_seed.sql";
const FOUNDER_CARD_SEED_FILE = "005_founder_card_section.sql";
/** Every file that seeds a section, in the order migrate.js applies them. */
const SEED_FILES = Object.freeze([SEED_FILE, FOUNDER_CARD_SEED_FILE]);

const SEEDED = Object.freeze([
  { slug: "overview", title: "Overview", body_md: "", sort_order: 1, published: false, updated_by: null },
  { slug: "team", title: "Team", body_md: "", sort_order: 2, published: false, updated_by: null },
  { slug: "faq", title: "FAQ", body_md: "", sort_order: 3, published: false, updated_by: null },
  { slug: "contact", title: "Contact", body_md: "", sort_order: 4, published: false, updated_by: null },
  { slug: "founder_card", title: "Founder card", body_md: "", sort_order: 5, published: false, updated_by: null },
]);

const TEAM = Object.freeze({
  title: "  The team  ",
  bodyMd: "## Founders\n\n- Ada Example, engineering\n- [Book a call](https://example.com/book)\n",
  published: true,
});

/** Signed-in-only rows for the founder card (KP5: an invented number from the UK's drama range). */
const FOUNDER_CARD = Object.freeze({
  title: "Founder card",
  bodyMd: "- [+44 7700 900123](tel:+447700900123) Mobile\n- [example.com/someone](https://example.com/someone) Site\n",
  published: true,
});

/** @type {import("../db.js").Db} */
let db;
let app;
/** @type {Readonly<Record<string, string>>} each seed file's SQL, by file name */
let seedSql;
beforeAll(async () => {
  db = await createTestDb();
  const scripts = await Promise.all(SEED_FILES.map((name) => readFile(join(MIGRATIONS_DIR, name), "utf8")));
  seedSql = Object.freeze(Object.fromEntries(SEED_FILES.map((name, i) => [name, scripts[i]])));
});
afterAll(() => db.end());

/** Runs one seed file again, as a second migration run would if it were not recorded. */
const runSeed = (name) => db.tx((client) => client.exec(seedSql[name]));

/** Puts the five rows back as the migrations seed them. */
async function reseed() {
  await db.query("DELETE FROM investors.sections");
  for (const name of SEED_FILES) await runSeed(name);
}

beforeEach(async () => {
  const portal = createInvestorsPortal({
    env: ENV,
    deps: { logger: { warn: vi.fn(), error: vi.fn() }, createDb: () => db, ...fakeAuthDeps() },
  });
  await portal.start();
  app = express().use("/api/investors", portal.apiRouter);
  await db.query("DELETE FROM investors.investors");
  await reseed();
});

const api = (method, path, who = ADMIN) =>
  request(app)[method](`/api/investors${path}`).set("Authorization", bearer(who.id));

const save = (slug, body, who = ADMIN) => api("put", `/admin/sections/${slug}`, who).send(body);

async function sectionRows() {
  const { rows } = await db.query(
    "SELECT slug, title, body_md, sort_order, published, updated_by FROM investors.sections ORDER BY sort_order",
  );
  return rows;
}

/** @param {string} slug */
const publish = (slug) => db.query("UPDATE investors.sections SET published = true WHERE slug = $1", [slug]);

describe("the sections seeds (002_sections_seed.sql, 005_founder_card_section.sql)", () => {
  it("are recorded as applied and leave the five sections, empty and unpublished", async () => {
    for (const name of SEED_FILES) {
      const { rows } = await db.query("SELECT 1 FROM investors.schema_migrations WHERE name = $1", [name]);
      expect(rows, name).toHaveLength(1);
    }
    expect(await sectionRows()).toEqual(SEEDED);
  });

  it("keeps an edited section as it is when the seed runs again (ON CONFLICT DO NOTHING)", async () => {
    expect((await save("team", TEAM)).status).toBe(200);
    const edited = await sectionRows();
    await runSeed(SEED_FILE);
    expect(await sectionRows()).toEqual(edited);
  });

  it("keeps an edited founder card as it is when 005 runs again (ON CONFLICT DO NOTHING)", async () => {
    expect((await save("founder_card", FOUNDER_CARD)).status).toBe(200);
    const edited = await sectionRows();
    expect(edited.find((row) => row.slug === "founder_card")).toMatchObject({
      body_md: FOUNDER_CARD.bodyMd,
      published: true,
      updated_by: ADMIN.id,
    });
    await runSeed(FOUNDER_CARD_SEED_FILE);
    expect(await sectionRows()).toEqual(edited);
  });
});

describe("GET /sections (investors)", () => {
  it("answers only the published sections, in order, with the investor's fields", async () => {
    await publish("contact");
    await publish("team");
    const res = await api("get", "/sections", ADA);
    expect(res.status).toBe(200);
    expect(res.body.sections.map((section) => section.slug)).toEqual(["team", "contact"]);
    for (const section of res.body.sections) {
      expect(Object.keys(section).sort()).toEqual(["bodyMd", "slug", "title", "updatedAt"]);
    }
    expect(res.body.sections[0]).toMatchObject({ slug: "team", title: "Team", bodyMd: "" });
  });

  it("leaves the founder card out while it is unpublished, as it ships, and lists it once published", async () => {
    for (const slug of ["overview", "team", "faq", "contact"]) await publish(slug);
    const before = await api("get", "/sections", ADA);
    expect(before.status).toBe(200);
    expect(before.body.sections.map((section) => section.slug)).toEqual(["overview", "team", "faq", "contact"]);

    expect((await save("founder_card", FOUNDER_CARD)).status).toBe(200);
    const after = await api("get", "/sections", ADA);
    expect(after.body.sections.map((section) => section.slug)).toEqual(["overview", "team", "faq", "contact", "founder_card"]);
    expect(after.body.sections.at(-1)).toMatchObject({ slug: "founder_card", bodyMd: FOUNDER_CARD.bodyMd });
  });

  it("answers an empty list while nothing is published", async () => {
    const res = await api("get", "/sections", ADA);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sections: [] });
  });

  it("is refused without a token and to a blocked investor", async () => {
    expect((await request(app).get("/api/investors/sections")).status).toBe(401);
    expect((await api("get", "/me", ADA)).status).toBe(200);
    await db.query("UPDATE investors.investors SET blocked = true WHERE clerk_user_id = $1", [ADA.id]);
    const res = await api("get", "/sections", ADA);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "blocked" });
  });
});

describe("GET /admin/sections and /admin/sections/:slug", () => {
  it("lists every section, unpublished included, in order, with the admin's fields", async () => {
    await publish("faq");
    const res = await api("get", "/admin/sections");
    expect(res.status).toBe(200);
    expect(res.body.sections.map(({ slug, published, sortOrder }) => ({ slug, published, sortOrder }))).toEqual([
      { slug: "overview", published: false, sortOrder: 1 },
      { slug: "team", published: false, sortOrder: 2 },
      { slug: "faq", published: true, sortOrder: 3 },
      { slug: "contact", published: false, sortOrder: 4 },
      { slug: "founder_card", published: false, sortOrder: 5 },
    ]);
    expect(Object.keys(res.body.sections[0]).sort()).toEqual(
      ["bodyMd", "published", "slug", "sortOrder", "title", "updatedAt", "updatedBy"].sort(),
    );
  });

  it("reads one section, unpublished included", async () => {
    const res = await api("get", "/admin/sections/contact");
    expect(res.status).toBe(200);
    expect(res.body.section).toMatchObject({ slug: "contact", title: "Contact", bodyMd: "", published: false, updatedBy: null });
  });
});

describe("PUT /admin/sections/:slug", () => {
  it("saves the title (trimmed), markdown and published flag, stamps updated_at and updated_by; investors then read it", async () => {
    const { rows: before } = await db.query("SELECT updated_at FROM investors.sections WHERE slug = $1", ["team"]);
    const res = await save("team", TEAM);
    expect(res.status).toBe(200);
    expect(res.body.section).toMatchObject({
      slug: "team",
      title: "The team",
      bodyMd: TEAM.bodyMd,
      published: true,
      sortOrder: 2,
      updatedBy: ADMIN.id,
    });
    expect(new Date(res.body.section.updatedAt).getTime()).toBeGreaterThanOrEqual(before[0].updated_at.getTime());

    const read = await api("get", "/admin/sections/team");
    expect(read.body.section).toEqual(res.body.section);
    const { rows } = await db.query("SELECT updated_by, body_md FROM investors.sections WHERE slug = $1", ["team"]);
    expect(rows[0]).toEqual({ updated_by: ADMIN.id, body_md: TEAM.bodyMd });

    const investor = await api("get", "/sections", ADA);
    expect(investor.body.sections).toEqual([
      { slug: "team", title: "The team", bodyMd: TEAM.bodyMd, updatedAt: res.body.section.updatedAt },
    ]);
  });

  it("unpublishes, and an empty body is allowed", async () => {
    await save("team", TEAM);
    const res = await save("team", { title: "Team", bodyMd: "", published: false });
    expect(res.status).toBe(200);
    expect(res.body.section).toMatchObject({ bodyMd: "", published: false });
    expect((await api("get", "/sections", ADA)).body).toEqual({ sections: [] });
  });

  it("ignores identity and order fields in the body", async () => {
    const res = await save("faq", { ...TEAM, slug: "team", updatedBy: ADA.id, sortOrder: 99 });
    expect(res.status).toBe(200);
    expect(res.body.section).toMatchObject({ slug: "faq", sortOrder: 3, updatedBy: ADMIN.id });
  });

  it("takes a body of exactly the limit and refuses one character more", async () => {
    const atLimit = "a".repeat(SECTION_LIMITS.bodyMd);
    expect((await save("faq", { ...TEAM, bodyMd: atLimit })).status).toBe(200);
    const over = await save("faq", { ...TEAM, bodyMd: `${atLimit}a` });
    expect(over.status).toBe(400);
    expect(over.body).toEqual({ error: "invalid", fields: { bodyMd: "too_long" } });
  });

  it.each([
    [{}, { title: "required", bodyMd: "required", published: "required" }],
    [{ ...TEAM, title: "   " }, { title: "required" }],
    [{ ...TEAM, title: "t".repeat(SECTION_LIMITS.title + 1) }, { title: "too_long" }],
    [{ ...TEAM, title: "Two\nlines" }, { title: "invalid" }],
    [{ ...TEAM, bodyMd: null }, { bodyMd: "invalid" }],
    [{ ...TEAM, bodyMd: "nul \u0000 byte" }, { bodyMd: "invalid" }],
    [{ ...TEAM, published: "yes" }, { published: "invalid" }],
  ])("refuses %j with 400 invalid and changes nothing", async (body, fields) => {
    const res = await save("team", body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", fields });
    expect(await sectionRows()).toEqual(SEEDED);
  });

  it("keeps tabs and Windows line breaks in the markdown", async () => {
    const bodyMd = "| a |\tb |\r\n|---|---|\r\n";
    const res = await save("faq", { ...TEAM, bodyMd });
    expect(res.status).toBe(200);
    expect(res.body.section.bodyMd).toBe(bodyMd);
  });
});

describe("unknown sections and the admin gate", () => {
  it.each(["nope", "Team", "team!", "a".repeat(SECTION_LIMITS.slug + 1), "%27%20OR%201%3D1"])(
    "answers 404 not_found for slug %s on read and save",
    async (slug) => {
      const read = await api("get", `/admin/sections/${slug}`);
      expect(read.status).toBe(404);
      expect(read.body).toEqual({ error: "not_found" });
      const saved = await save(slug, TEAM);
      expect(saved.status).toBe(404);
      expect(saved.body).toEqual({ error: "not_found" });
    },
  );

  it("creates no row for an unknown slug", async () => {
    await save("nope", TEAM);
    expect(await sectionRows()).toEqual(SEEDED);
  });

  it("answers 403 forbidden to a signed-in investor on every admin section route, and saves nothing", async () => {
    for (const [method, path] of [
      ["get", "/admin/sections"],
      ["get", "/admin/sections/team"],
      ["put", "/admin/sections/team"],
    ]) {
      const res = await api(method, path, ADA).send(TEAM);
      expect({ method, path, status: res.status, body: res.body }).toEqual({
        method,
        path,
        status: 403,
        body: { error: "forbidden" },
      });
    }
    expect(await sectionRows()).toEqual(SEEDED);
  });
});
