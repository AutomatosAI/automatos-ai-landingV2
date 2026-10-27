/**
 * CSV for the admin investors export (US-012): RFC 4180 text that a
 * spreadsheet opens safely.
 *
 * - Every cell is quoted with its inner quotes doubled, so a comma, quote or
 *   line break stays inside its cell.
 * - A cell that a spreadsheet would run as a formula (one starting with
 *   = + - @, a tab or a carriage return) gets a single quote in front first:
 *   an investor named '=HYPERLINK(...)' stays text (CSV injection). Numbers
 *   here are counts, never negative, so no number is changed by it.
 * - Rows end with CRLF, and the file starts with a UTF-8 byte order mark so
 *   Excel reads accented names as UTF-8.
 */
import { CHEQUE_SIZES, INVESTOR_TYPES, SOURCES } from "./routes/me.js";

export const CSV_BOM = "﻿";

const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One quoted cell; null and undefined are empty.
 * @param {unknown} value
 */
export function csvCell(value) {
  const text = value == null ? "" : String(value);
  const inert = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${inert.replaceAll('"', '""')}"`;
}

/**
 * @template T
 * @typedef {{header: string, value: (row: T) => unknown}} CsvColumn
 */

/**
 * The header row and one line per row, every cell through csvCell.
 * @template T
 * @param {readonly CsvColumn<T>[]} columns
 * @param {readonly T[]} rows
 */
export function toCsv(columns, rows) {
  const header = columns.map((column) => csvCell(column.header));
  const lines = rows.map((row) => columns.map((column) => csvCell(column.value(row))));
  return `${CSV_BOM}${[header, ...lines].map((cells) => cells.join(",")).join("\r\n")}\r\n`;
}

/**
 * The profile's choice lists (routes/me.js) as the app labels them
 * (investors/src/strings.ts profile; alert-messages.js mirrors them too):
 * keep the three in sync. A test fails when a choice has no label here.
 */
export const CHOICE_LABELS = Object.freeze({
  investorType: Object.freeze({
    vc: "Venture capital",
    angel: "Angel",
    family_office: "Family office",
    corporate: "Corporate",
    accelerator: "Accelerator",
    other: "Other",
  }),
  chequeSize: Object.freeze({
    lt_50k: "Under 50k",
    "50k_250k": "50k to 250k",
    "250k_1m": "250k to 1M",
    gt_1m: "Over 1M",
  }),
  source: Object.freeze({
    websummit: "Web Summit",
    intro: "An introduction",
    website: "The Automatos website",
    other: "Somewhere else",
  }),
});

/** Which list each label map covers, for that test. */
export const CHOICE_LISTS = Object.freeze({ investorType: INVESTOR_TYPES, chequeSize: CHEQUE_SIZES, source: SOURCES });

/**
 * A stored choice as the form showed it; an unknown value as stored; empty when not given.
 * @param {keyof typeof CHOICE_LABELS} list
 * @param {string | null} value
 */
function choice(list, value) {
  if (value === null) return "";
  const labels = /** @type {Readonly<Record<string, string>>} */ (CHOICE_LABELS[list]);
  return Object.hasOwn(labels, value) ? labels[value] : value;
}

/**
 * 'YYYY-MM-DD HH:MM' in UTC, which every spreadsheet reads as a date and time.
 * @param {Date | string | null} value
 */
export function csvDateTime(value) {
  if (value === null) return "";
  return new Date(value).toISOString().slice(0, 16).replace("T", " ");
}

/** @param {number} ms */
const minutes = (ms) => (Math.round(ms / 6000) / 10).toFixed(1);

/** @param {boolean | null} flag */
const yesNo = (flag) => (flag === null ? "" : flag ? "yes" : "no");

/**
 * A list row (queries/investor-list.js toListRow) with the investor's
 * marketing opt-in, null when the row was deleted while exporting.
 * @typedef {ReturnType<typeof import("./queries/investor-list.js").toListRow> & {marketingOptIn: boolean | null}} CsvInvestor
 */

/**
 * The investors table's columns, in its order, plus the email and the
 * marketing opt-in. Deck progress is two numbers: '14/20' in a cell would be
 * read as a date.
 * @type {readonly CsvColumn<CsvInvestor>[]}
 */
export const INVESTOR_CSV_COLUMNS = Object.freeze([
  { header: "Name", value: (row) => row.name },
  { header: "Email", value: (row) => row.email },
  { header: "Firm", value: (row) => row.firm },
  { header: "Investor type", value: (row) => choice("investorType", row.investorType) },
  { header: "Cheque size", value: (row) => choice("chequeSize", row.chequeSize) },
  { header: "Source", value: (row) => choice("source", row.source) },
  { header: "Signed up (UTC)", value: (row) => csvDateTime(row.createdAt) },
  { header: "Last seen (UTC)", value: (row) => csvDateTime(row.lastSeenAt) },
  { header: "Sessions", value: (row) => row.sessions },
  { header: "Total time (min)", value: (row) => minutes(row.totalMs) },
  { header: "Documents opened", value: (row) => row.docsOpened },
  { header: "Downloads", value: (row) => row.downloads },
  { header: "Deck furthest page", value: (row) => row.deckProgress?.maxPage ?? "" },
  { header: "Deck page count", value: (row) => row.deckProgress?.pageCount ?? "" },
  { header: "Blocked", value: (row) => yesNo(row.blocked) },
  { header: "Marketing opt-in", value: (row) => yesNo(row.marketingOptIn) },
]);

/**
 * 'investors-YYYY-MM-DD.csv', the day in UTC.
 * @param {Date} now
 */
export function investorsCsvFileName(now) {
  return `investors-${now.toISOString().slice(0, 10)}.csv`;
}
