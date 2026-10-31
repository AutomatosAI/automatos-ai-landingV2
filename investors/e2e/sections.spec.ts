import { expect, test, type Locator, type Page } from "@playwright/test";

import type { SectionSlug } from "../src/sections/sections-model";
import { strings } from "../src/strings";

import { mockPortal, signIn, type ApiRoutes } from "./fixtures/api";
import { expectNoRawHtml } from "./fixtures/markdown";
import { capture } from "./fixtures/screens";
import { BOOKING, OVERVIEW_POINT, OVERVIEW_SECTION, SECTIONS } from "./fixtures/sections";

/*
 * The admins' sections as investors read them (US-009): the overview on
 * the home page, then the Team, Story, FAQ and Contact pages, each saved as
 * a screenshot. Every API call is mocked (fixtures/api.ts).
 */

const nav = strings.nav;

/** GET /sections without the story: unpublished, as 006_story_section.sql ships it. */
const STORY_UNPUBLISHED: ApiRoutes = {
  "GET /sections": { status: 200, body: { sections: SECTIONS.filter((section) => section.slug !== "story") } },
};

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

function titleOf(slug: SectionSlug): string {
  const section = SECTIONS.find((each) => each.slug === slug);
  if (section === undefined) throw new Error(`e2e fixtures: no ${slug} section`);
  return section.title;
}

/** A section page's title, then its markdown's headings, demoted under it (## is an h3). */
async function expectSectionPage(page: Page, slug: SectionSlug, headings: number): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: titleOf(slug), exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(headings);
}

test("home: the overview above the documents, its raw HTML dropped", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await page.goto("./");

  await expect(page.getByRole("heading", { level: 1, name: strings.home.title })).toBeVisible();
  const overview = page.getByRole("region", { name: OVERVIEW_SECTION.title, exact: true });
  await expect(overview.getByText(OVERVIEW_POINT)).toBeVisible();
  await expectNoRawHtml(page, overview);
  // Under the header, Quick access and the product links (PRD-003 §3.2), above the rule and the documents.
  const products = page.getByRole("region", { name: strings.company.alsoFromAutomatos, exact: true });
  await expect(products).toBeVisible();
  const [productsBox, overviewBox] = await Promise.all([products.boundingBox(), overview.boundingBox()]);
  expect(overviewBox?.y ?? 0).toBeGreaterThan(productsBox?.y ?? Number.POSITIVE_INFINITY);

  await capture(page, testInfo, "home-overview");
  expect(api.unmocked()).toEqual([]);
});

test("team page", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await page.goto("team");

  await expectSectionPage(page, "team", 2);

  await capture(page, testInfo, "team");
  expect(api.unmocked()).toEqual([]);
});

/**
 * The portal's links: the sidebar on desktop; on a phone the sidebar is
 * hidden, so the header's menu is opened first and its sheet holds them.
 */
async function portalLinks(page: Page, isMobile: boolean | undefined): Promise<Locator> {
  if (isMobile) await page.getByRole("button", { name: nav.openMenu, exact: true }).click();
  return page.getByRole("navigation", { name: nav.label, exact: true }).getByRole("link");
}

test("story page: the published section, its link between Team and FAQ", async ({ page, isMobile }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await page.goto("story");

  await expectSectionPage(page, "story", 2);
  await capture(page, testInfo, "story");

  const links = await portalLinks(page, isMobile);
  await expect(links).toHaveText([nav.home, nav.documents, nav.team, nav.story, nav.faq, nav.contact, nav.profile]);
  await expect(links.filter({ hasText: nav.story })).toHaveAttribute("aria-current", "page");
  expect(api.unmocked()).toEqual([]);
});

test("story page: unpublished, no link and Coming soon.", async ({ page, isMobile }, testInfo) => {
  const api = await mockPortal(page, "investor", STORY_UNPUBLISHED);
  await page.goto("story");

  await expect(page.getByRole("heading", { level: 1, name: strings.sections.titles.story, exact: true })).toBeVisible();
  await expect(page.getByText(strings.sections.comingSoon, { exact: true })).toBeVisible();
  await capture(page, testInfo, "story-unpublished");

  const links = await portalLinks(page, isMobile);
  await expect(links).toHaveText([nav.home, nav.documents, nav.team, nav.faq, nav.contact, nav.profile]);
  await expect(page.getByRole("link", { name: nav.story, exact: true })).toHaveCount(0);
  expect(api.unmocked()).toEqual([]);
});

test("FAQ page", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await page.goto("faq");

  await expectSectionPage(page, "faq", 2);

  await capture(page, testInfo, "faq");
  expect(api.unmocked()).toEqual([]);
});

test("contact page: the section only, its booking link in a new tab", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await page.goto("contact");

  await expectSectionPage(page, "contact", 0);
  const booking = page.getByRole("link", { name: BOOKING.label, exact: true });
  await expect(booking).toHaveAttribute("href", BOOKING.href);
  await expect(booking).toHaveAttribute("target", "_blank");
  await expect(booking).toHaveAttribute("rel", "noopener noreferrer");
  // PRD-003 US-307: no fixed second address under the section's text.
  await expect(page.getByRole("link", { name: strings.contact.helloEmail, exact: true })).toHaveCount(0);

  await capture(page, testInfo, "contact");
  expect(api.unmocked()).toEqual([]);
});
