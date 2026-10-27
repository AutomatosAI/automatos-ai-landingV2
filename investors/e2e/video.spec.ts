import { expect, test, type Page } from "@playwright/test";

import type { InvestorDocument } from "../src/documents/documents-api";
import { strings } from "../src/strings";

import { linkKey, mockPortal, routeVideo, signIn } from "./fixtures/api";
import { DEMO_ID, LIBRARY } from "./fixtures/data";
import { capture } from "./fixtures/screens";

/*
 * The video player (US-008) at /investors/documents/:id: the player once
 * its link is issued, and the failure once storage has refused the link
 * and its one renewal. Every API call and the storage link are mocked.
 */

const copy = strings.viewer;

function demoDocument(): InvestorDocument {
  const demo = LIBRARY.find((document) => document.id === DEMO_ID);
  if (demo === undefined) throw new Error("e2e fixtures: the demo video is missing from LIBRARY");
  return demo;
}

const demo = demoDocument();

const downloadButton = (page: Page) =>
  page.getByRole("button", { name: strings.library.actionLabel(strings.library.download, demo.title), exact: true });

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("video: the player, its link asked for once", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await routeVideo(page, "hold");
  // A media element still fetching holds the load event: wait for the document only.
  await page.goto(`documents/${DEMO_ID}`, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: demo.title })).toBeVisible();
  const video = page.locator("video");
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute("aria-label", copy.video.label(demo.title));
  await expect(video).toHaveAttribute("controls");
  await expect(downloadButton(page)).toBeVisible();

  await capture(page, testInfo, "video-player");
  // The server records an open per link it issues (KP16): one visit, one link.
  expect(api.bodies(linkKey(DEMO_ID))).toEqual([{ mode: "inline" }]);
  expect(api.unmocked()).toEqual([]);
});

test("video: storage refuses the link and its renewal, the download stays", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await routeVideo(page, "refuse");
  await page.goto(`documents/${DEMO_ID}`);

  const failure = page.getByRole("alert");
  await expect(failure).toContainText(copy.failed.title);
  await expect(failure).toContainText(copy.video.failed);
  await expect(page.locator("video")).toHaveCount(0);
  await expect(page.getByRole("button", { name: copy.retry, exact: true })).toBeVisible();
  await expect(downloadButton(page)).toBeVisible();

  await capture(page, testInfo, "video-failed");
  // A refused link is renewed once (viewer/link-model.ts); the second refusal shows the failure.
  expect(api.bodies(linkKey(DEMO_ID))).toEqual([{ mode: "inline" }, { mode: "inline" }]);
  expect(api.unmocked()).toEqual([]);
});
