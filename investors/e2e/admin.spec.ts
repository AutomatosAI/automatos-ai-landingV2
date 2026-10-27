import { expect, test } from "@playwright/test";

import { strings } from "../src/strings";

import { mockPortal, signIn } from "./fixtures/api";
import { ADA_ID, ADMIN_DOCUMENTS, INVESTORS, OVERVIEW } from "./fixtures/data";
import { capture } from "./fixtures/screens";

/*
 * The admin's screens (US-011 to US-014) at the project's width, each saved
 * as a screenshot, signed in as an admin with the invented data.
 */

const copy = strings.admin;

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("admin overview: numbers, chart and latest activity", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "admin");
  await page.goto("admin");

  await expect(page.getByRole("heading", { level: 1, name: copy.overview.title })).toBeVisible();
  const kpis = page.getByRole("list", { name: copy.overview.kpis.label });
  await expect(kpis).toContainText(String(OVERVIEW.investorsTotal));
  await expect(kpis).toContainText(copy.overview.kpis.newInLastWeek(OVERVIEW.investorsNew7d));
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
  await expect(page.getByRole("list", { name: copy.overview.latest.title }).getByRole("listitem")).toHaveCount(
    OVERVIEW.latestEvents.length,
  );

  await capture(page, testInfo, "admin-overview");
  expect(api.unmocked()).toEqual([]);
});

test("admin investors table", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "admin");
  await page.goto("admin/investors");

  await expect(page.getByRole("heading", { level: 1, name: copy.investors.title })).toBeVisible();
  const table = page.getByRole("table", { name: copy.investors.tableLabel });
  await expect(table).toBeVisible();
  // A header row, then one row per investor.
  await expect(table.getByRole("row")).toHaveCount(INVESTORS.investors.length + 1);
  await expect(table).toContainText("Ada Example");
  await expect(table).toContainText(copy.investors.blocked);

  await capture(page, testInfo, "admin-investors");
  expect(api.unmocked()).toEqual([]);
});

test("admin investor detail: profile, documents and timeline", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "admin");
  await page.goto(`admin/investors/${ADA_ID}`);

  await expect(page.getByRole("heading", { level: 1, name: "Ada Example" })).toBeVisible();
  await expect(page.getByRole("table", { name: copy.investor.documents.tableLabel })).toContainText("Example deck");
  const timeline = page.getByRole("list", { name: copy.investor.timeline.label });
  await expect(timeline).toContainText("Downloaded Example financial model");
  await expect(timeline).toContainText("Read page 2 of Example deck");

  await capture(page, testInfo, "admin-investor-detail");
  expect(api.unmocked()).toEqual([]);
});

test("admin documents", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "admin");
  await page.goto("admin/documents");

  await expect(page.getByRole("heading", { level: 1, name: copy.documents.title })).toBeVisible();
  const table = page.getByRole("table", { name: copy.documents.tableLabel });
  await expect(table).toBeVisible();
  for (const document of ADMIN_DOCUMENTS) {
    await expect(table).toContainText(document.title);
  }
  await expect(table).toContainText(copy.documents.noFile);

  await capture(page, testInfo, "admin-documents");
  expect(api.unmocked()).toEqual([]);
});
