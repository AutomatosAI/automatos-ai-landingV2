import { expect, test } from "@playwright/test";

import { strings } from "../src/strings";

import { mockPortal, signIn } from "./fixtures/api";
import { MEMO_ID } from "./fixtures/data";
import { expectNoRawHtml } from "./fixtures/markdown";
import { capture } from "./fixtures/screens";
import { ADMIN_SECTIONS, OVERVIEW_POINT, OVERVIEW_SECTION } from "./fixtures/sections";
import { MEMO_STATS } from "./fixtures/stats";

/*
 * The admin's wave-2 screens: the section editor with its live preview
 * (US-016) and one document's analytics (US-015), signed in as an admin
 * with the invented data, each saved as a screenshot.
 */

const sections = strings.admin.sections;
const stats = strings.admin.stats;

/** Typed into the editor, to see the preview follow. */
const ADDED_LINE = "A line added in the editor.";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("admin sections: the list, then the overview's editor with its preview", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "admin");
  await page.goto("admin/sections");

  await expect(page.getByRole("heading", { level: 1, name: sections.title, exact: true })).toBeVisible();
  const list = page.getByRole("list", { name: sections.listLabel, exact: true });
  await expect(list.getByRole("listitem")).toHaveCount(ADMIN_SECTIONS.length);
  await expect(list).toContainText(sections.places.overview);
  await capture(page, testInfo, "admin-sections");

  await list.getByRole("link", { name: sections.editLabel(OVERVIEW_SECTION.title), exact: true }).click();
  await expect(page).toHaveURL(/\/investors\/admin\/sections\/overview$/);
  await expect(page.getByRole("heading", { level: 1, name: sections.editTitle(OVERVIEW_SECTION.title) })).toBeVisible();
  const text = page.getByLabel(sections.fields.body.label, { exact: true });
  await expect(text).toHaveValue(OVERVIEW_SECTION.bodyMd);
  const preview = page.getByRole("region", { name: sections.preview.label, exact: true });
  await expect(preview.getByText(OVERVIEW_POINT)).toBeVisible();
  await expectNoRawHtml(page, preview);

  await text.fill(`${OVERVIEW_SECTION.bodyMd}\n\n${ADDED_LINE}`);
  await expect(preview).toContainText(ADDED_LINE);
  await expect(page.getByText(sections.dirty, { exact: true })).toBeVisible();
  await expectNoRawHtml(page, preview);

  await capture(page, testInfo, "admin-section-editor");
  expect(api.unmocked()).toEqual([]);
});

test("admin document stats: the numbers, both page charts and the readers", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "admin");
  await page.goto(`admin/documents/${MEMO_ID}/stats`);

  await expect(page.getByRole("heading", { level: 1, name: MEMO_STATS.document.title })).toBeVisible();
  await expect(page.getByRole("list", { name: stats.kpis.label })).toContainText(stats.kpis.readers);
  await expect(page.getByRole("heading", { level: 3, name: stats.dwell.title, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: stats.reach.title, exact: true })).toBeVisible();
  // The time chart has one bar per page; the reach line one point per page.
  await expect(page.locator(".recharts-bar-rectangle")).toHaveCount(MEMO_STATS.pages.length);
  await expect(page.locator(".recharts-line-dot")).toHaveCount(MEMO_STATS.pages.length);
  const readers = page.getByRole("table", { name: stats.readers.tableLabel, exact: true });
  // A header row, then one row per reader.
  await expect(readers.getByRole("row")).toHaveCount(MEMO_STATS.readers.length + 1);
  await expect(readers).toContainText("Ada Example");
  await expect(readers).toContainText(stats.readers.unnamed);

  await capture(page, testInfo, "admin-document-stats");
  expect(api.unmocked()).toEqual([]);
});
