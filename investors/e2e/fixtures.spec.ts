import { expect, test } from "@playwright/test";

import { PDF_PAGE_COUNT, twoPagePdf } from "./fixtures/pdf";

/*
 * The viewer's PDF fixture, checked without a browser (KP5: under 20 kB,
 * generated, two pages). A broken cross-reference table would still render
 * (pdf.js rebuilds it), so the offsets are checked here instead.
 */

test("the PDF fixture: two pages, under 20 kB, exact xref offsets", () => {
  const pdf = twoPagePdf();
  const text = pdf.toString("latin1");

  expect(pdf.length).toBeLessThan(20 * 1024);
  expect(text.startsWith("%PDF-1.4\n")).toBe(true);
  expect(text.match(/\/Type \/Page\b/g)).toHaveLength(PDF_PAGE_COUNT);
  expect(text).toContain(`/Count ${PDF_PAGE_COUNT}`);

  const startxref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(text)?.[1]);
  expect(text.startsWith("xref\n", startxref)).toBe(true);
  const offsets = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n \n/gm)].map((match) => Number(match[1]));
  expect(offsets.length).toBeGreaterThan(PDF_PAGE_COUNT);
  offsets.forEach((offset, i) => expect(text.startsWith(`${i + 1} 0 obj\n`, offset)).toBe(true));
});
