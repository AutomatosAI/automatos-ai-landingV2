import { describe, expect, it } from "vitest";

import type { DocumentKind } from "@/documents/kinds";
import { investorDocument } from "@/test/fixtures";

import { groupsBelowPitch, hasFeaturedPitch, isPitchCategory, pickFeaturedPitch } from "../library-model";

const doc = (id: string, category: string, kind: DocumentKind) => investorDocument({ id, title: id, category, kind });

const DECK = doc("deck", "Pitch", "pdf");
const VIDEO = doc("video", "Pitch", "video");
const ONE_PAGER = doc("one-pager", "Pitch", "pdf");
const MODEL = doc("model", "Business model", "spreadsheet");
const DEMO = doc("demo", "Product", "video");
const MEMO = doc("memo", "Market", "pdf");

const ids = (documents: readonly { id: string }[]) => documents.map((document) => document.id);
const picked = (documents: Parameters<typeof pickFeaturedPitch>[0]) => {
  const pitch = pickFeaturedPitch(documents);
  return { deck: pitch.deck?.id ?? null, video: pitch.video?.id ?? null };
};

describe("isPitchCategory", () => {
  it.each(["Pitch", "pitch", "PITCH", "  Pitch  ", "\tpitch\n", "Pitch deck", "pitch-video", "Pitches"])(
    "“%s” is a pitch category",
    (category) => {
      expect(isPitchCategory(category)).toBe(true);
    },
  );

  it.each(["", "  ", "Business model", "The pitch", "Our pitch", "Product", "pitc"])("“%s” is not", (category) => {
    expect(isPitchCategory(category)).toBe(false);
  });
});

describe("pickFeaturedPitch", () => {
  it("takes the first pitch PDF as the deck and the first pitch video as the video", () => {
    expect(picked([MODEL, DECK, VIDEO, ONE_PAGER, DEMO])).toEqual({ deck: "deck", video: "video" });
  });

  it("follows the admin's order, not the kind's or the category's spelling", () => {
    const later = doc("later-video", " pitch ", "video");
    expect(picked([ONE_PAGER, later, DECK, VIDEO])).toEqual({ deck: "one-pager", video: "later-video" });
  });

  it("matches the category whatever its case and spaces", () => {
    expect(picked([doc("a", "  PITCH deck ", "pdf"), doc("b", "pitch\t", "video")])).toEqual({ deck: "a", video: "b" });
  });

  it("ignores PDFs and videos in other categories", () => {
    expect(picked([MEMO, DEMO, MODEL])).toEqual({ deck: null, video: null });
    expect(picked([MEMO, DEMO, VIDEO])).toEqual({ deck: null, video: "video" });
    expect(picked([DEMO, MEMO, DECK])).toEqual({ deck: "deck", video: null });
  });

  it("features no other kind, even in a pitch category", () => {
    const kinds: readonly DocumentKind[] = ["spreadsheet", "slides", "doc", "other"];
    expect(picked(kinds.map((kind) => doc(kind, "Pitch", kind)))).toEqual({ deck: null, video: null });
  });

  it("gives neither for no documents and leaves its input alone", () => {
    expect(picked([])).toEqual({ deck: null, video: null });
    const input = Object.freeze([VIDEO, DECK]);
    pickFeaturedPitch(input);
    expect(ids(input)).toEqual(["video", "deck"]);
  });
});

describe("hasFeaturedPitch", () => {
  it("is true when either the deck or the video is there", () => {
    expect(hasFeaturedPitch({ deck: DECK, video: VIDEO })).toBe(true);
    expect(hasFeaturedPitch({ deck: DECK, video: null })).toBe(true);
    expect(hasFeaturedPitch({ deck: null, video: VIDEO })).toBe(true);
    expect(hasFeaturedPitch({ deck: null, video: null })).toBe(false);
  });
});

describe("groupsBelowPitch", () => {
  const groups = (documents: Parameters<typeof pickFeaturedPitch>[0]) =>
    groupsBelowPitch(documents, pickFeaturedPitch(documents)).map((group) => [group.category, ids(group.documents)]);

  it("drops only the featured deck and video, keeping the other pitch documents in their group", () => {
    expect(groups([MODEL, DECK, ONE_PAGER, VIDEO, DEMO])).toEqual([
      ["Business model", ["model"]],
      ["Pitch", ["one-pager"]],
      ["Product", ["demo"]],
    ]);
  });

  it("keeps the admin's category order when the featured deck was its group's first document", () => {
    expect(groups([DECK, MODEL, ONE_PAGER])).toEqual([
      ["Pitch", ["one-pager"]],
      ["Business model", ["model"]],
    ]);
  });

  it("drops a group the featured deck and video leave empty", () => {
    expect(groups([DECK, MODEL, VIDEO])).toEqual([["Business model", ["model"]]]);
    expect(groups([VIDEO, DECK])).toEqual([]);
  });

  it("keeps every group when nothing is featured, and leaves its input alone", () => {
    const all = Object.freeze([MODEL, DEMO]);
    expect(groupsBelowPitch(all, { deck: null, video: null }).map((group) => ids(group.documents))).toEqual([["model"], ["demo"]]);
    expect(ids(all)).toEqual(["model", "demo"]);
  });
});
