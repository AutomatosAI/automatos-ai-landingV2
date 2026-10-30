import type { ContactRow } from "./contact-rows";

/*
 * The founder_card section's rows (PRD-003 §4, D5, US-305): what signed-in
 * investors see after the work email on Home's founder card. The section
 * holds one row per line, "- [shown text](address) label", for example
 * "- [+00 0000 000000](tel:+0000000000) Mobile" (an invented number).
 *
 * The rows have this parser of their own, not react-markdown: Markdown.tsx's
 * default urlTransform empties a tel: address, and a card row is not free
 * text. Pure, and it never throws: a line that does not fit is skipped and
 * counted, so the admin preview can say how many.
 */

/** How many rows the card shows, and how many characters a row's text and label may hold. */
export const CARD_ROW_LIMITS = Object.freeze({ rows: 6, text: 60, label: 30 });

export interface CardRows {
  /** The rows the card shows, in the section's order. */
  readonly rows: readonly ContactRow[];
  /** Lines with anything on them that the card leaves out: not a row, or past the last row it shows. */
  readonly skipped: number;
}

const NO_ROWS: CardRows = Object.freeze({ rows: Object.freeze([]), skipped: 0 });

const LINE_BREAK = /\r\n|\r|\n/;

/** "- [text](address) label": a dash and a space, the text, the address, then the label. */
const ROW_LINE = /^-\s+\[([^\]]*)\]\(([^()]*)\)(.*)$/;

/** tel: then digits, "+" and spaces only, with at least one digit (one way to match, so no backtracking). */
const TEL_ADDRESS = /^tel:([+ ]*\d[\d+ ]*)$/i;
const MAILTO_ADDRESS = /^mailto:[^\s@]+@[^\s@]+$/i;
const HTTPS_PREFIX = /^https:\/\//i;
const WHITESPACE = /\s/;

function isHttpsAddress(address: string): boolean {
  if (!HTTPS_PREFIX.test(address)) return false;
  try {
    const url = new URL(address);
    return url.protocol === "https:" && url.hostname !== "";
  } catch {
    return false;
  }
}

/**
 * Where a row links: an https: address or a mailto: as written, or a tel:
 * with its spaces taken out; null for anything else (javascript:, data:,
 * http:, a tel: with letters, an address with spaces).
 */
function rowHref(address: string): string | null {
  const tel = TEL_ADDRESS.exec(address);
  if (tel !== null) return `tel:${(tel[1] ?? "").replace(/ /g, "")}`;
  if (WHITESPACE.test(address)) return null;
  if (MAILTO_ADDRESS.test(address)) return address;
  return isHttpsAddress(address) ? address : null;
}

/** Not blank, and at most `max` characters (counted as the reader sees them, not as UTF-16 units). */
const fits = (value: string, max: number) => value !== "" && [...value].length <= max;

/** One line as a row, or null when it does not fit the shape, a scheme or a limit. */
function parseRow(line: string): ContactRow | null {
  const match = ROW_LINE.exec(line.trim());
  if (match === null) return null;
  const text = (match[1] ?? "").trim();
  const href = rowHref((match[2] ?? "").trim());
  const label = (match[3] ?? "").trim();
  if (href === null || !fits(text, CARD_ROW_LIMITS.text) || !fits(label, CARD_ROW_LIMITS.label)) return null;
  return Object.freeze({ text, href, label });
}

/**
 * The founder card's rows from the section's markdown: the first
 * CARD_ROW_LIMITS.rows lines that fit, in order, and how many other lines
 * hold anything (blank lines are not counted). Never throws.
 */
export function parseCardRows(source: string): CardRows {
  if (typeof source !== "string") return NO_ROWS;
  const lines = source.split(LINE_BREAK).filter((line) => line.trim() !== "");
  const fitting = lines.map(parseRow).filter((row): row is ContactRow => row !== null);
  const rows = Object.freeze(fitting.slice(0, CARD_ROW_LIMITS.rows));
  return Object.freeze({ rows, skipped: lines.length - rows.length });
}
