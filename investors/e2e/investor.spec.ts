import { expect, test, type Page } from "@playwright/test";

import { FOUNDER, PRODUCT_LINKS } from "../src/company/company-data";
import { strings } from "../src/strings";
import { MOOD_STORAGE_KEY } from "../src/theme/mood";

import { mockPortal, signIn } from "./fixtures/api";
import { DECK_ID, LIBRARY } from "./fixtures/data";
import { capture, waitForImages, waitForPdfPage } from "./fixtures/screens";

/*
 * The investor's screens (US-004 to US-007) at the project's width, each
 * saved as a screenshot. Every API call is mocked (fixtures/api.ts); a call
 * no route answers fails the test.
 */

/** A phone number however it is written (PRD-003 US-302's check, on the rendered page). */
const PHONE_LIKE = /\+?\d[\d ()-]{7,}\d/;

/**
 * The signed-out page (PRD-003 §3.1): the company first, the one primary
 * action, the Inside the portal cards, the founder and the team, the
 * product links. It shows no phone number and no tel: link, whatever a
 * section holds (D5); each spec also checks it never asked for /sections.
 */
async function expectTeaser(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: strings.teaser.title })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: strings.company.name, exact: true })).toBeVisible();
  await expect(page.getByText(strings.company.spine, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: strings.auth.createAccount, exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: strings.auth.signIn, exact: true })).toBeEnabled();
  const notice = page.getByText(strings.trackingNotice.before.trim());
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("link", { name: strings.trackingNotice.policyLink })).toHaveAttribute(
    "href",
    strings.trackingNotice.policyHref,
  );
  await expect(notice).toContainText(strings.contact.privacyEmail);

  const inside = page.getByRole("list", { name: strings.teaser.insideHeading });
  await expect(inside.getByRole("button")).toHaveCount(strings.teaser.inside.length);
  for (const item of strings.teaser.inside) {
    await expect(inside.getByRole("button", { name: item, exact: true })).toBeEnabled();
  }

  await expect(page.getByRole("heading", { level: 2, name: FOUNDER.name, exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: strings.company.founderPhotoAlt })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(FOUNDER.email) })).toHaveAttribute(
    "href",
    `mailto:${FOUNDER.email}`,
  );
  await expect(page.getByRole("link", { name: strings.company.bookCall })).toHaveCount(0);
  for (const link of [...PRODUCT_LINKS.seeItWorking, ...PRODUCT_LINKS.alsoFromAutomatos]) {
    await expect(page.locator(`a[href="${link.href}"]`)).toBeVisible();
  }

  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toMatch(PHONE_LIKE);
  await waitForImages(page);
}

test("teaser: signed out, the company first, with the tracking notice", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await page.goto("./");

  await expect(page.locator("body")).toHaveAttribute("data-mood", "bone");
  await expectTeaser(page);

  await capture(page, testInfo, "teaser");
  expect(api.calls()).not.toContain("GET /sections");
  expect(api.unmocked()).toEqual([]);
});

test("teaser: the pitch mood", async ({ page }, testInfo) => {
  await page.addInitScript(
    ({ key, mood }) => window.localStorage.setItem(key, mood),
    { key: MOOD_STORAGE_KEY, mood: "pitch" },
  );
  const api = await mockPortal(page, "investor");
  await page.goto("./");

  await expect(page.locator("body")).toHaveAttribute("data-mood", "pitch");
  await expectTeaser(page);

  await capture(page, testInfo, "teaser-mood-pitch");
  expect(api.calls()).not.toContain("GET /sections");
  expect(api.unmocked()).toEqual([]);
});

test("profile form: a field error, the updates box unticked", async ({ page }, testInfo) => {
  await signIn(page);
  const api = await mockPortal(page, "new_investor");
  await page.goto("./");

  // A first visit lands on the form, whatever page was asked for.
  await expect(page).toHaveURL(/\/investors\/profile$/);
  await expect(page.getByRole("heading", { level: 1, name: strings.profile.firstTitle })).toBeVisible();
  const optIn = page.getByRole("checkbox", { name: strings.profile.fields.marketingOptIn.label });
  await expect(optIn).not.toBeChecked();

  await page.getByRole("button", { name: strings.profile.saveFirst }).click();
  await expect(page.getByRole("alert")).toHaveText(strings.profile.checkFields);
  const firm = page.getByLabel(strings.profile.fields.firm.label, { exact: true });
  await expect(firm).toHaveAttribute("aria-invalid", "true");
  await expect(firm).toBeFocused();
  await expect(page.getByText(strings.profile.errors.required).first()).toBeVisible();
  await expect(optIn).not.toBeChecked();
  await expect(page.getByText(strings.trackingNotice.before.trim())).toBeVisible();

  await capture(page, testInfo, "profile-error");
  expect(api.unmocked()).toEqual([]);
});

test("home: the published documents", async ({ page }, testInfo) => {
  await signIn(page);
  const api = await mockPortal(page, "investor");
  await page.goto("./");

  await expect(page.getByRole("heading", { level: 1, name: strings.home.title })).toBeVisible();
  for (const document of LIBRARY) {
    await expect(page.getByRole("heading", { level: 3, name: document.title, exact: true })).toBeVisible();
  }

  await capture(page, testInfo, "home");
  expect(api.unmocked()).toEqual([]);
});

test("viewer: the deck on page 2", async ({ page }, testInfo) => {
  await signIn(page);
  const api = await mockPortal(page, "investor");
  await page.goto(`documents/${DECK_ID}`);

  const toolbar = page.getByRole("toolbar", { name: strings.viewer.toolbarLabel });
  await expect(toolbar.getByText("Page 1 of 2")).toBeVisible();
  await waitForPdfPage(page, 1);
  await toolbar.getByRole("button", { name: strings.viewer.next }).click();
  await expect(toolbar.getByText("Page 2 of 2")).toBeVisible();
  await expect(toolbar.getByRole("button", { name: strings.viewer.next })).toBeDisabled();
  await waitForPdfPage(page, 2);

  await capture(page, testInfo, "viewer-page-2");
  expect(api.unmocked()).toEqual([]);
});

test("admin: a non-admin sees 'Not available'", async ({ page }) => {
  await signIn(page);
  const api = await mockPortal(page, "investor");
  await page.goto("admin");

  await expect(page.getByRole("heading", { level: 1, name: "Not available" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: strings.admin.navLabel })).toHaveCount(0);
  // The admin routes are not mocked for an investor: any admin call would be listed here.
  expect(api.unmocked()).toEqual([]);
});
