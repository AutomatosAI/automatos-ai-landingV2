import { expect, type Locator, type Page } from "@playwright/test";

import { MARKDOWN_MARKER } from "./sections";

/**
 * The overview's hostile HTML (sections.ts) neither ran nor reached the
 * page: no script or image in the rendered markdown, no script element
 * anywhere holding its code, its text dropped rather than shown, and the
 * global it would set still unset.
 */
export async function expectNoRawHtml(page: Page, rendered: Locator): Promise<void> {
  await expect(rendered.locator("script, img")).toHaveCount(0);
  await expect(page.locator("script", { hasText: MARKDOWN_MARKER })).toHaveCount(0);
  await expect(rendered).not.toContainText(MARKDOWN_MARKER);
  const ran = await page.evaluate((name) => Reflect.get(window, name), MARKDOWN_MARKER);
  expect(ran).toBeUndefined();
}
