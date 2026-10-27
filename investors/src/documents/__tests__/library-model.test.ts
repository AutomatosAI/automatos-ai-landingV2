import { describe, expect, it } from "vitest";

import { investorDocument } from "@/test/fixtures";

import { documentFacts, filterDocuments, groupByCategory, opensInViewer, searchTerms } from "../library-model";

const DECK = investorDocument({ id: "d1", title: "Example deck", category: "Pitch" });
const MODEL = investorDocument({
  id: "d2",
  title: "Example model",
  description: "Revenue and costs by quarter.",
  category: "Business model",
  kind: "spreadsheet",
});
const ONE_PAGER = investorDocument({ id: "d3", title: "One-pager", description: null, category: " pitch " });
const DEMO = investorDocument({ id: "d4", title: "Product demo", description: "Five minutes.", category: "Product", kind: "video" });

const ids = (documents: readonly { id: string }[]) => documents.map((document) => document.id);

describe("groupByCategory", () => {
  it("orders groups by their first document and keeps the server's order inside each", () => {
    const groups = groupByCategory([DECK, MODEL, ONE_PAGER, DEMO]);
    expect(groups.map((group) => group.category)).toEqual(["Pitch", "Business model", "Product"]);
    expect(groups.map((group) => ids(group.documents))).toEqual([["d1", "d3"], ["d2"], ["d4"]]);
  });

  it("follows the admin's order when it puts a later category first", () => {
    const groups = groupByCategory([MODEL, DECK, DEMO, ONE_PAGER]);
    expect(groups.map((group) => group.category)).toEqual(["Business model", "Pitch", "Product"]);
    expect(ids(groups[1]?.documents ?? [])).toEqual(["d1", "d3"]);
  });

  it("takes the category's spelling from its first document, trimmed", () => {
    const groups = groupByCategory([ONE_PAGER, DECK]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.category).toBe("pitch");
  });

  it("gives no groups for no documents and leaves its input alone", () => {
    expect(groupByCategory([])).toEqual([]);
    const input = Object.freeze([DECK, MODEL]);
    groupByCategory(input);
    expect(ids(input)).toEqual(["d1", "d2"]);
  });
});

describe("filterDocuments", () => {
  const all = [DECK, MODEL, ONE_PAGER, DEMO];

  it("keeps everything for a blank query", () => {
    expect(filterDocuments(all, "")).toBe(all);
    expect(filterDocuments(all, "   ")).toBe(all);
  });

  it.each([
    ["deck", ["d1"]],
    ["EXAMPLE", ["d1", "d2"]],
    ["quarter", ["d2"]],
    ["business", ["d2"]],
    ["pitch", ["d1", "d3"]],
    ["  minutes ", ["d4"]],
    ["example revenue", ["d2"]],
    ["example video", []],
    ["nothing like this", []],
  ])("“%s” matches %j by title, description or category", (query, expected) => {
    expect(ids(filterDocuments(all, query))).toEqual(expected);
  });

  it("does not search the file name", () => {
    expect(filterDocuments(all, "example-deck.pdf")).toEqual([]);
  });

  it("splits the query into lower-case words", () => {
    expect(searchTerms("  Pitch   DECK ")).toEqual(["pitch", "deck"]);
    expect(searchTerms("")).toEqual([]);
  });
});

describe("documentFacts", () => {
  it("names the kind, the size and the updated date", () => {
    expect(documentFacts(DECK)).toEqual(["PDF", "1.5 MB", "Updated 21 Oct 2026"]);
    expect(documentFacts(investorDocument({ kind: "slides", sizeBytes: 20_480 }))).toEqual([
      "Slides",
      "20 KB",
      "Updated 21 Oct 2026",
    ]);
    expect(documentFacts(investorDocument({ kind: "other", sizeBytes: 512 }))[1]).toBe("512 B");
  });

  it("leaves out a size or a date it does not have", () => {
    expect(documentFacts(investorDocument({ sizeBytes: null }))).toEqual(["PDF", "Updated 21 Oct 2026"]);
    expect(documentFacts(investorDocument({ updatedAt: "not a date" }))).toEqual(["PDF", "1.5 MB"]);
  });
});

describe("opensInViewer", () => {
  it("opens a PDF in the viewer and downloads every other kind", () => {
    expect(opensInViewer("pdf")).toBe(true);
    for (const kind of ["video", "spreadsheet", "slides", "doc", "other"] as const) {
      expect(opensInViewer(kind)).toBe(false);
    }
  });
});
