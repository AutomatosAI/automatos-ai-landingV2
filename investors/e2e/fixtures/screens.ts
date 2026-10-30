import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Page, type TestInfo } from "@playwright/test";

/** investors/e2e/screenshots/<project>/<name>.png: the CI e2e job uploads this folder (investors.yml). */
const SCREENSHOTS_DIR = fileURLToPath(new URL("../screenshots/", import.meta.url));

/** Saves a full-page screenshot once the web fonts are in, and attaches it to the report. */
export async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const file = path.join(SCREENSHOTS_DIR, testInfo.project.name, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path: file, contentType: "image/png" });
}

/**
 * Waits until every picture on the page has loaded (the bundled cover and
 * the founder's photo, PRD-003 US-301), so a screenshot shows them and a
 * picture Vite failed to emit fails the spec rather than the eye.
 */
export async function waitForImages(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
  );
}

/**
 * Height of the fixture's dark bar on each page, as a fraction from the top
 * (pdf.ts: y 300 to 312 of 540, measured from the bottom).
 */
const BAR_ROW = 1 - 306 / 540;

/**
 * Waits until pdf.js has painted a page. react-pdf keeps the canvas hidden
 * until the render finishes; the pixel check then proves the fixture itself
 * drew (its dark bar is on the canvas), not just an empty page.
 */
export async function waitForPdfPage(page: Page, pageNumber: number): Promise<void> {
  const selector = `.react-pdf__Page[data-page-number="${pageNumber}"] canvas`;
  await expect(page.locator(selector)).toBeVisible();
  await page.waitForFunction(
    ({ css, row }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(css);
      const context = canvas?.getContext("2d");
      if (!canvas || !context || canvas.width === 0) return false;
      const { data } = context.getImageData(0, Math.floor(canvas.height * row), canvas.width, 1);
      return data.some((value, i) => i % 4 === 0 && value < 64);
    },
    { css: selector, row: BAR_ROW },
  );
}
