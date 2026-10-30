import { expect, test } from "@playwright/test";

import { strings } from "../src/strings";

import { mockPortal, signIn, type ApiRoutes } from "./fixtures/api";
import { capture } from "./fixtures/screens";
import { OVERVIEW_POINT, OVERVIEW_SECTION } from "./fixtures/sections";

/*
 * Document storage down (W3-01): GET /documents answers 503
 * storage_unavailable, so the home page stays up, overview included, with a
 * note where the documents would be, not the full-page 'Temporarily
 * unavailable' screen, and the quick-access tiles that need no list.
 * Saved as a screenshot.
 */

const DOCUMENTS = "GET /documents";
const STORAGE_DOWN: ApiRoutes = { [DOCUMENTS]: { status: 503, body: { error: "storage_unavailable" } } };

test("home: storage down, the overview and the note in place of the documents", async ({ page }, testInfo) => {
  await signIn(page);
  const api = await mockPortal(page, "investor", STORAGE_DOWN);
  await page.goto("./");

  await expect(page.getByRole("heading", { level: 1, name: strings.home.title })).toBeVisible();
  const overview = page.getByRole("region", { name: OVERVIEW_SECTION.title, exact: true });
  await expect(overview.getByText(OVERVIEW_POINT)).toBeVisible();
  const note = page.getByRole("status").filter({ hasText: strings.documents.unavailable });
  await expect(note).toBeVisible();
  await expect(page.getByText(strings.status.unavailable.title)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: strings.home.pitchTitle })).toHaveCount(0);
  // Quick access (PRD-003 US-306): no deck, video or Documents tile without the list; Team, FAQ and Book a call stay.
  const tiles = page.getByRole("list", { name: strings.company.quickAccess.heading, exact: true }).getByRole("link");
  await expect(tiles).toHaveCount(3);
  expect(await tiles.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual([
    "/investors/team",
    "/investors/faq",
    "/investors/contact",
  ]);

  await capture(page, testInfo, "home-storage-unavailable");

  // Retry reads the list again; storage is still down, so the note stays.
  const asked = () => api.calls().filter((key) => key === DOCUMENTS).length;
  const before = asked();
  await note.getByRole("button", { name: strings.status.error.retry, exact: true }).click();
  await expect.poll(asked).toBe(before + 1);
  await expect(note).toBeVisible();
  expect(api.unmocked()).toEqual([]);
});
