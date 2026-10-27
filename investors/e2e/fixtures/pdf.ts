/**
 * The viewer's fixture (KP5): a two-page PDF built here at run time, so no
 * binary sits in the repo. Each page is a slide-sized sheet with a dark bar
 * and a line of Helvetica (a standard font: nothing embedded), well under
 * 20 kB. Plain ASCII throughout, so string length is byte length and the
 * xref offsets are exact.
 */

export const PDF_PAGE_COUNT = 2;

/** Slide-sized, 16:9, in points. */
const PAGE_WIDTH = 960;
const PAGE_HEIGHT = 540;

/** Escapes a PDF literal string's delimiters. */
function pdfText(value: string): string {
  return value.replace(/[\\()]/g, (char) => `\\${char}`);
}

function pageContent(page: number): string {
  return [
    "0.93 0.90 0.86 rg",
    `0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f`,
    "0.06 0.08 0.07 rg",
    "72 300 480 12 re f",
    `BT /F1 44 Tf 72 360 Td (${pdfText("Example deck")}) Tj ET`,
    `BT /F1 20 Tf 72 250 Td (${pdfText(`Page ${page} of ${PDF_PAGE_COUNT}. An invented test document.`)}) Tj ET`,
  ].join("\n");
}

function stream(content: string): string {
  return `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
}

/** Object bodies in number order: catalog, page tree, then a page and its content per page, then the font. */
function objects(): readonly string[] {
  const fontNumber = 3 + PDF_PAGE_COUNT * 2;
  const pageNumbers = Array.from({ length: PDF_PAGE_COUNT }, (_, i) => 3 + i * 2);
  const pages = pageNumbers.flatMap((number, i) => [
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontNumber} 0 R >> >> /Contents ${number + 1} 0 R >>`,
    stream(pageContent(i + 1)),
  ]);
  return [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${PDF_PAGE_COUNT} >>`,
    ...pages,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
}

/** A cross-reference entry: exactly 20 bytes, as the format requires. */
const xrefEntry = (offset: number, generation: string, kind: "n" | "f") =>
  `${String(offset).padStart(10, "0")} ${generation} ${kind} \n`;

/** The whole file: header, objects, xref table, trailer. */
export function twoPagePdf(): Buffer {
  const header = "%PDF-1.4\n";
  const bodies = objects();
  const { text, offsets } = bodies.reduce(
    (acc, body, i) => ({
      text: `${acc.text}${i + 1} 0 obj\n${body}\nendobj\n`,
      offsets: [...acc.offsets, acc.text.length],
    }),
    { text: header, offsets: [] as readonly number[] },
  );
  const xref = [
    `xref\n0 ${bodies.length + 1}\n`,
    xrefEntry(0, "65535", "f"),
    ...offsets.map((offset) => xrefEntry(offset, "00000", "n")),
  ].join("");
  const trailer = `trailer\n<< /Size ${bodies.length + 1} /Root 1 0 R >>\nstartxref\n${text.length}\n%%EOF\n`;
  return Buffer.from(`${text}${xref}${trailer}`, "latin1");
}
