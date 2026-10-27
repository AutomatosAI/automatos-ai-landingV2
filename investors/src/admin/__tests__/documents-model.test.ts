import { describe, expect, it } from "vitest";

import { adminDocument } from "@/test/fixtures";

import type { AdminDocument } from "../documents-api";
import { categoriesOf, removeDocument, reorderPlan, sortDocuments, upsertDocument } from "../documents-model";

const DECK = adminDocument({ id: "doc-a", title: "Deck", sortOrder: 0 });
const ONE_PAGER = adminDocument({ id: "doc-b", title: "One-pager", sortOrder: 1, category: "Overview" });
const MODEL = adminDocument({ id: "doc-c", title: "Model", sortOrder: 2, category: "Business model" });

const ids = (documents: readonly Pick<AdminDocument, "id">[]) => documents.map((document) => document.id);

describe("sortDocuments", () => {
  it("orders by sort order, then creation, then id, like the server", () => {
    const early = adminDocument({ id: "z", sortOrder: 5, createdAt: "2026-10-01T10:00:00.000Z" });
    const late = adminDocument({ id: "a", sortOrder: 5, createdAt: "2026-10-02T10:00:00.000Z" });
    const twinA = adminDocument({ id: "m", sortOrder: 5, createdAt: "2026-10-03T10:00:00.000Z" });
    const twinB = adminDocument({ id: "n", sortOrder: 5, createdAt: "2026-10-03T10:00:00.000Z" });
    const first = adminDocument({ id: "y", sortOrder: 0 });
    expect(ids(sortDocuments([twinB, late, first, twinA, early]))).toEqual(["y", "z", "a", "m", "n"]);
  });

  it("returns a new list and leaves its input alone", () => {
    const input = Object.freeze([MODEL, DECK]);
    const sorted = sortDocuments(input);
    expect(ids(sorted)).toEqual(["doc-a", "doc-c"]);
    expect(ids(input)).toEqual(["doc-c", "doc-a"]);
  });
});

describe("upsertDocument and removeDocument", () => {
  it("replaces a document in place and keeps the order", () => {
    const renamed = { ...ONE_PAGER, title: "Summary" };
    const list = upsertDocument([DECK, ONE_PAGER, MODEL], renamed);
    expect(list.map((document) => document.title)).toEqual(["Deck", "Summary", "Model"]);
  });

  it("adds a new document where its sort order puts it", () => {
    const added = adminDocument({ id: "doc-d", sortOrder: 3 });
    expect(ids(upsertDocument([DECK, ONE_PAGER, MODEL], added))).toEqual(["doc-a", "doc-b", "doc-c", "doc-d"]);
  });

  it("re-sorts when the sort order changed", () => {
    expect(ids(upsertDocument([DECK, ONE_PAGER, MODEL], { ...DECK, sortOrder: 9 }))).toEqual(["doc-b", "doc-c", "doc-a"]);
  });

  it("removes by id", () => {
    const list = Object.freeze([DECK, ONE_PAGER]);
    expect(ids(removeDocument(list, "doc-a"))).toEqual(["doc-b"]);
    expect(ids(list)).toEqual(["doc-a", "doc-b"]);
  });
});

describe("reorderPlan", () => {
  it("swaps the sort orders of neighbours", () => {
    expect(reorderPlan([DECK, ONE_PAGER, MODEL], "doc-b", "up")).toEqual([
      { id: "doc-b", sortOrder: 0 },
      { id: "doc-a", sortOrder: 1 },
    ]);
    expect(reorderPlan([DECK, ONE_PAGER, MODEL], "doc-b", "down")).toEqual([
      { id: "doc-b", sortOrder: 2 },
      { id: "doc-c", sortOrder: 1 },
    ]);
  });

  it("swaps gapped sort orders without renumbering", () => {
    const gapped = [adminDocument({ id: "x", sortOrder: 10 }), adminDocument({ id: "y", sortOrder: 40 })];
    expect(reorderPlan(gapped, "y", "up")).toEqual([
      { id: "y", sortOrder: 10 },
      { id: "x", sortOrder: 40 },
    ]);
  });

  it("numbers the whole list when the neighbours share a sort order", () => {
    const tied = [
      adminDocument({ id: "p", sortOrder: 0, createdAt: "2026-10-01T10:00:00.000Z" }),
      adminDocument({ id: "q", sortOrder: 0, createdAt: "2026-10-02T10:00:00.000Z" }),
      adminDocument({ id: "r", sortOrder: 7 }),
    ];
    const plan = reorderPlan(tied, "q", "up");
    expect(plan).toEqual([
      { id: "p", sortOrder: 1 },
      { id: "r", sortOrder: 2 },
    ]);
    const applied = tied.map((document) => ({ ...document, ...plan.find((change) => change.id === document.id) }));
    expect(ids(sortDocuments(applied))).toEqual(["q", "p", "r"]);
  });

  it("plans nothing past either end or for an unknown id", () => {
    expect(reorderPlan([DECK, ONE_PAGER], "doc-a", "up")).toEqual([]);
    expect(reorderPlan([DECK, ONE_PAGER], "doc-b", "down")).toEqual([]);
    expect(reorderPlan([DECK, ONE_PAGER], "missing", "up")).toEqual([]);
  });

  it("reads the list in the server's order, whatever order it is given in", () => {
    expect(reorderPlan([MODEL, DECK, ONE_PAGER], "doc-c", "up")).toEqual([
      { id: "doc-c", sortOrder: 1 },
      { id: "doc-b", sortOrder: 2 },
    ]);
  });
});

describe("categoriesOf", () => {
  it("lists each category once, alphabetically", () => {
    expect(categoriesOf([MODEL, DECK, ONE_PAGER, { category: "Pitch" }])).toEqual(["Business model", "Overview", "Pitch"]);
  });
});
