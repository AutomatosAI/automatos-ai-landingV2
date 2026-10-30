import { describe, expect, it } from "vitest";

import { CARD_ROW_LIMITS, parseCardRows } from "../card-rows";
import { isContactAddress } from "../contact-rows";

/* Invented (KP5): numbers from the UK's drama range, addresses on example domains. */
const PHONE_LINE = "- [+44 7700 900123](tel:+44 7700 900123) Mobile";
const SITE_LINE = "- [example.com/someone](https://example.com/someone) Site";
const EMAIL_LINE = "- [someone@example.com](mailto:someone@example.com) Personal";

const PHONE_ROW = { text: "+44 7700 900123", href: "tel:+447700900123", label: "Mobile" };
const SITE_ROW = { text: "example.com/someone", href: "https://example.com/someone", label: "Site" };
const EMAIL_ROW = { text: "someone@example.com", href: "mailto:someone@example.com", label: "Personal" };

/** A row line `count` times over, each with its own invented address. */
const siteLines = (count: number) =>
  Array.from({ length: count }, (_, i) => `- [Site ${i + 1}](https://example.com/${i + 1}) Site`);

describe("parseCardRows: rows", () => {
  it("reads one row per line, in order: text, address and label", () => {
    expect(parseCardRows([PHONE_LINE, SITE_LINE, EMAIL_LINE].join("\n"))).toEqual({
      rows: [PHONE_ROW, SITE_ROW, EMAIL_ROW],
      skipped: 0,
    });
  });

  it("takes the spaces out of a tel: address, and keeps the shown text as written", () => {
    const { rows } = parseCardRows("- [+44 7700 900123](tel:+44 7700 900123) Mobile");
    expect(rows).toEqual([PHONE_ROW]);
  });

  it("trims the text, the address, the label and the line, and reads Windows and old Mac line breaks", () => {
    const source = `  -   [ example.com/someone ](  https://example.com/someone  )   Site  \r\n${PHONE_LINE}\r${EMAIL_LINE}`;
    expect(parseCardRows(source)).toEqual({ rows: [SITE_ROW, PHONE_ROW, EMAIL_ROW], skipped: 0 });
  });

  it("gives addresses the card may link to", () => {
    const { rows } = parseCardRows([PHONE_LINE, SITE_LINE, EMAIL_LINE].join("\n"));
    for (const row of rows) expect(isContactAddress(row.href), row.href).toBe(true);
  });

  it("returns frozen rows", () => {
    const parsed = parseCardRows(PHONE_LINE);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.rows)).toBe(true);
    expect(Object.isFrozen(parsed.rows[0])).toBe(true);
  });
});

describe("parseCardRows: skipped lines", () => {
  it("is empty for an empty or blank section, and counts no blank line", () => {
    expect(parseCardRows("")).toEqual({ rows: [], skipped: 0 });
    expect(parseCardRows("  \n\t\n\r\n")).toEqual({ rows: [], skipped: 0 });
    expect(parseCardRows(`\n\n${PHONE_LINE}\n\n`)).toEqual({ rows: [PHONE_ROW], skipped: 0 });
  });

  it.each([
    ["prose", "Call me any time."],
    ["a heading", "## Contact"],
    ["a link with no list dash", "[example.com](https://example.com) Site"],
    ["another list marker", "* [example.com](https://example.com) Site"],
    ["no space after the dash", "-[example.com](https://example.com) Site"],
    ["no label", "- [example.com](https://example.com)"],
    ["a blank label", "- [example.com](https://example.com)    "],
    ["no text", "- [](https://example.com) Site"],
    ["a blank text", "- [   ](https://example.com) Site"],
    ["no address", "- [example.com]() Site"],
    ["no brackets round the address", "- [example.com] https://example.com Site"],
  ])("skips %s", (_name, line) => {
    expect(parseCardRows(`${PHONE_LINE}\n${line}`)).toEqual({ rows: [PHONE_ROW], skipped: 1 });
  });

  it.each([
    ["javascript:", "- [Click](javascript:alert(1)) Site"],
    ["javascript: without brackets inside", "- [Click](javascript:void0) Site"],
    ["data:", "- [Hi](data:text/html,hi) Site"],
    ["http:", "- [example.com](http://example.com) Site"],
    ["a relative address", "- [Contact](/contact) Page"],
    ["a bare host", "- [example.com](example.com) Site"],
    ["https: with no host", "- [Nowhere](https://) Site"],
    ["https: with a space", "- [example.com](https://example.com/a b) Site"],
    ["a mailto: with no @", "- [someone](mailto:someone) Email"],
    ["a mailto: with a space", "- [someone](mailto:some one@example.com) Email"],
    ["ftp:", "- [Files](ftp://example.com) Files"],
  ])("refuses %s", (_name, line) => {
    expect(parseCardRows(line)).toEqual({ rows: [], skipped: 1 });
  });

  it.each([
    ["letters", "- [Call](tel:+44 7700 CALLME) Mobile"],
    ["only letters", "- [Call](tel:callme) Mobile"],
    ["a dash", "- [Call](tel:+44-7700-900123) Mobile"],
    ["brackets", "- [Call](tel:+44 [0]7700 900123) Mobile"],
    ["no digit", "- [Call](tel:+ ) Mobile"],
    ["nothing after the scheme", "- [Call](tel:) Mobile"],
    ["a parameter", "- [Call](tel:+447700900123;ext=1) Mobile"],
  ])("refuses a tel: with %s", (_name, line) => {
    expect(parseCardRows(line)).toEqual({ rows: [], skipped: 1 });
  });

  it("reads schemes in any case", () => {
    const { rows } = parseCardRows(
      ["- [Call](TEL:+44 7700 900123) Mobile", "- [Mail](MAILTO:someone@example.com) Personal", "- [Site](HTTPS://example.com) Site"].join("\n"),
    );
    expect(rows.map((row) => row.href)).toEqual(["tel:+447700900123", "MAILTO:someone@example.com", "HTTPS://example.com"]);
  });
});

describe("parseCardRows: limits", () => {
  it("shows at most the first six rows and counts the rest as skipped", () => {
    expect(CARD_ROW_LIMITS.rows).toBe(6);
    const parsed = parseCardRows(siteLines(8).join("\n"));
    expect(parsed.rows.map((row) => row.text)).toEqual(["Site 1", "Site 2", "Site 3", "Site 4", "Site 5", "Site 6"]);
    expect(parsed.skipped).toBe(2);
  });

  it("counts a line that does not fit before the sixth row, and still shows six", () => {
    const parsed = parseCardRows(["Not a row", ...siteLines(6)].join("\n"));
    expect(parsed.rows).toHaveLength(6);
    expect(parsed.skipped).toBe(1);
  });

  it("takes text of up to 60 characters and a label of up to 30, and skips one character more", () => {
    expect(CARD_ROW_LIMITS).toEqual({ rows: 6, text: 60, label: 30 });
    const text = "t".repeat(CARD_ROW_LIMITS.text);
    const label = "l".repeat(CARD_ROW_LIMITS.label);
    expect(parseCardRows(`- [${text}](https://example.com) ${label}`).rows).toEqual([
      { text, href: "https://example.com", label },
    ]);
    expect(parseCardRows(`- [${text}t](https://example.com) Site`)).toEqual({ rows: [], skipped: 1 });
    expect(parseCardRows(`- [Site](https://example.com) ${label}l`)).toEqual({ rows: [], skipped: 1 });
  });

  it("counts characters as the reader sees them", () => {
    const text = "é".repeat(CARD_ROW_LIMITS.text - 1) + "🙂";
    expect(parseCardRows(`- [${text}](https://example.com) Site`).rows).toHaveLength(1);
  });
});

describe("parseCardRows never throws", () => {
  it("answers no rows for what is not text", () => {
    for (const value of [undefined, null, 42, {}, []]) {
      expect(parseCardRows(value as unknown as string)).toEqual({ rows: [], skipped: 0 });
    }
  });

  it("skips odd lines without throwing", () => {
    const odd = ["- [a](https://[::1) x", "- [a](https://%zz) x", "- [a](tel:\u0000) x", "- [ ](https://example.com) x", "-"];
    expect(() => parseCardRows(odd.join("\n"))).not.toThrow();
  });

  it("reads a long section of near-rows quickly (no runaway matching)", () => {
    const longTel = `- [Call](tel:${"1 ".repeat(5_000)}x) Mobile`;
    const started = performance.now();
    expect(parseCardRows(longTel)).toEqual({ rows: [], skipped: 1 });
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});
