import { expect, test } from "@playwright/test";

import { mockPortal } from "./fixtures/api";

/*
 * The portal's tab icon in the build: index.html's links point at the
 * family kit's anchor, emitted hashed under /investors/assets/ (the one path
 * server/investors/static.js serves from the build), and each file loads as
 * itself, not as the app's index.html.
 */

/** A file the build emitted from src/assets/favicon/: its name, a hash, its extension. */
const emitted = (name: string, extension: string) => new RegExp(`^/investors/assets/${name}-[\\w-]+\\.${extension}$`);

const SVG_ICON = 'link[rel="icon"][type="image/svg+xml"]';

const ICONS = [
  { selector: 'link[rel="icon"][sizes="48x48"]', href: emitted("favicon", "ico") },
  { selector: SVG_ICON, href: emitted("favicon", "svg") },
  { selector: 'link[rel="apple-touch-icon"]', href: emitted("apple-touch-icon", "png") },
] as const;

/** The anchor's arc in the kit's automatos-investors favicon.svg. */
const ANCHOR_ARC = '<path d="M68 150Q128 230 188 150"';

test("the tab icon: the family kit's anchor, built under /investors/assets/", async ({ page, request }) => {
  const api = await mockPortal(page, "investor");
  await page.goto("./");

  for (const icon of ICONS) {
    const href = await page.locator(icon.selector).getAttribute("href");
    expect(href, icon.selector).toMatch(icon.href);
    const response = await request.get(href ?? "");
    expect(response.status(), href ?? icon.selector).toBe(200);
    expect(response.headers()["content-type"] ?? "", href ?? icon.selector).not.toContain("text/html");
  }

  const svg = await request.get((await page.locator(SVG_ICON).getAttribute("href")) ?? "");
  const source = await svg.text();
  expect(source).toContain(ANCHOR_ARC);
  expect(source).not.toMatch(/<metadata\b/);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  expect(api.unmocked()).toEqual([]);
});
