import { expect, test, type Page } from "@playwright/test";

import type { SectionSlug } from "../src/sections/sections-model";
import { strings } from "../src/strings";

import { mockPortal, signIn } from "./fixtures/api";
import { expectNoRawHtml } from "./fixtures/markdown";
import { capture } from "./fixtures/screens";
import { BOOKING, OVERVIEW_POINT, OVERVIEW_SECTION, SECTIONS } from "./fixtures/sections";

/*
 * The admins' sections as investors read them (US-009): the overview on
 * the home page, then the Team, FAQ and Contact pages, each saved as a
 * screenshot. Every API call is mocked (fixtures/api.ts).
 */

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

test("FAQ page", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await page.goto("faq");

  await expectSectionPage(page, "faq", 2);

  await capture(page, testInfo, "faq");
  expect(api.unmocked()).toEqual([]);
});

test("contact page: the booking link in a new tab, then the team's email", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await page.goto("contact");

  await expectSectionPage(page, "contact", 0);
  const booking = page.getByRole("link", { name: BOOKING.label, exact: true });
  await expect(booking).toHaveAttribute("href", BOOKING.href);
  await expect(booking).toHaveAttribute("target", "_blank");
  await expect(booking).toHaveAttribute("rel", "noopener noreferrer");
  const email = page.getByRole("link", { name: strings.contact.helloEmail, exact: true });
  await expect(email).toHaveAttribute("href", `mailto:${strings.contact.helloEmail}`);

  await capture(page, testInfo, "contact");
  expect(api.unmocked()).toEqual([]);
});
