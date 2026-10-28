import { expect, test, type Page } from "@playwright/test";

import type { InvestorDocument } from "../src/documents/documents-api";
import { strings } from "../src/strings";

import { isLinkKey, linkKey, mockPortal, routeVideo, signIn, type MockedApi } from "./fixtures/api";
import { DECK_ID, LIBRARY, PITCH_VIDEO_ID } from "./fixtures/data";
import { PDF_PAGE_COUNT } from "./fixtures/pdf";
import { capture, waitForPdfPage } from "./fixtures/screens";

/*
 * Wave 3's pitch: the deck and the pitch video at the top of the home page
 * (W3-03), and the deck as a slideshow (W3-02), each saved as a screenshot.
 * Every link the server issues is recorded as an open (KP16), so the specs
 * count them: none for loading home, one per press (KP20).
 */

const pitch = strings.home.pitch;
const present = strings.viewer.present;

function libraryDocument(id: string): InvestorDocument {
  const document = LIBRARY.find((each) => each.id === id);
  if (document === undefined) throw new Error(`e2e fixtures: ${id} is missing from LIBRARY`);
  return document;
}

const deck = libraryDocument(DECK_ID);
const video = libraryDocument(PITCH_VIDEO_ID);

const actionButton = (page: Page, action: string, title: string) =>
  page.getByRole("button", { name: strings.library.actionLabel(action, title), exact: true });

/** The link requests made so far, for any document. */
const linkCalls = (api: MockedApi) => api.calls().filter(isLinkKey);

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("home: the pitch block, the deck and the video's poster, no link asked for", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await routeVideo(page, "hold");
  await page.goto("./");

  await expect(page.getByRole("heading", { level: 1, name: strings.home.title })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: strings.home.pitchTitle, exact: true })).toBeVisible();
  // Featured once: the groups below leave the deck and the video out.
  for (const featured of [deck, video]) {
    await expect(page.getByRole("heading", { level: 3, name: featured.title, exact: true })).toHaveCount(1);
  }
  await expect(page.getByText(pitch.slides(PDF_PAGE_COUNT), { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: pitch.viewDeck, exact: true })).toBeVisible();
  await expect(actionButton(page, pitch.downloadDeck, deck.title)).toBeVisible();
  await expect(actionButton(page, pitch.play, video.title)).toBeVisible();
  await expect(actionButton(page, pitch.downloadVideo, video.title)).toBeVisible();

  await capture(page, testInfo, "home-pitch");
  // Rendering is not an open: once the page's own calls have settled, none of them asked for a link.
  await page.waitForLoadState("networkidle");
  expect(linkCalls(api)).toEqual([]);

  // Pressing play is: one link, for the video only.
  await actionButton(page, pitch.play, video.title).click();
  await expect(page.locator("video")).toHaveAttribute("aria-label", strings.viewer.video.label(video.title));
  expect(linkCalls(api)).toEqual([linkKey(PITCH_VIDEO_ID)]);
  expect(api.bodies(linkKey(PITCH_VIDEO_ID))).toEqual([{ mode: "inline" }]);
  expect(api.unmocked()).toEqual([]);
});

test("present: View the deck opens the slideshow, ArrowRight shows slide 2, Esc leaves", async ({ page }, testInfo) => {
  const api = await mockPortal(page, "investor");
  await page.goto("./");

  await page.getByRole("link", { name: pitch.viewDeck, exact: true }).click();
  // ?present=1 (viewer/present-route.ts) starts in the overlay: no full screen without a gesture on the viewer.
  await expect(page).toHaveURL(new RegExp(`/investors/documents/${DECK_ID}\\?present=1$`));
  const slideshow = page.getByRole("dialog", { name: present.label(deck.title), exact: true });
  const bar = slideshow.getByRole("toolbar", { name: present.toolbarLabel, exact: true });
  await expect(bar.getByText(present.slideOf(1, PDF_PAGE_COUNT), { exact: true })).toBeVisible();
  await waitForPdfPage(page, 1);

  await page.keyboard.press("ArrowRight");
  await expect(bar.getByText(present.slideOf(2, PDF_PAGE_COUNT), { exact: true })).toBeVisible();
  await expect(bar.getByRole("button", { name: present.next, exact: true })).toBeDisabled();
  await waitForPdfPage(page, 2);
  // The bar fades after 3 s without input; a pointer move keeps it in the screenshot.
  await page.mouse.move(8, 8);
  await capture(page, testInfo, "present-slide-2");

  await page.keyboard.press("Escape");
  await expect(slideshow).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/investors/documents/${DECK_ID}$`));
  // Back on the page view, at the slide the slideshow left off.
  const toolbar = page.getByRole("toolbar", { name: strings.viewer.toolbarLabel, exact: true });
  await expect(toolbar.getByText(strings.viewer.pageOf(2, PDF_PAGE_COUNT), { exact: true })).toBeVisible();
  // One open for the visit: presenting and leaving ask for no other link.
  expect(linkCalls(api)).toEqual([linkKey(DECK_ID)]);
  expect(api.unmocked()).toEqual([]);
});
