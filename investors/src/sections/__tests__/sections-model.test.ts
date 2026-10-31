import { describe, expect, it } from "vitest";

import { findSection, FOUNDER_CARD_SECTION, PAGE_SECTIONS, publishedPages, readableSection } from "../sections-model";

import { section } from "./fixtures";

describe("findSection and readableSection", () => {
  const sections = [section("overview"), section("team", { bodyMd: "  \n\t " }), section("faq")];

  it("finds a published section by slug; an unpublished one is not in the list", () => {
    expect(findSection(sections, "faq")?.title).toBe("FAQ");
    expect(findSection(sections, "contact")).toBeNull();
  });

  it("has something to read only when the body is not blank", () => {
    expect(readableSection(sections, "overview")?.bodyMd).toBe("Example overview text.");
    expect(readableSection(sections, "team")).toBeNull();
    expect(readableSection(sections, "contact")).toBeNull();
  });
});

describe("publishedPages", () => {
  it("gives the published section pages in the sidebar's order, whatever the list's order", () => {
    expect(publishedPages([section("contact"), section("overview"), section("team")])).toEqual(["team", "contact"]);
  });

  it("puts the Story after the Team and before the FAQ, as the admins' order has it last", () => {
    const all = [section("team"), section("faq"), section("contact"), section("founder_card"), section("story")];
    expect(publishedPages(all)).toEqual(["team", "story", "faq", "contact"]);
  });

  it("leaves the Story out until it is published, then lists it, text or not", () => {
    expect(publishedPages([section("team"), section("faq")])).toEqual(["team", "faq"]);
    expect(publishedPages([section("story", { bodyMd: "" })])).toEqual(["story"]);
  });

  it("keeps a published page with no text yet (its page says Coming soon)", () => {
    expect(publishedPages([section("faq", { bodyMd: "" })])).toEqual(["faq"]);
  });

  it("never lists the overview, which lives on the home page", () => {
    expect(publishedPages([section("overview")])).toEqual([]);
    expect(PAGE_SECTIONS).toEqual(["team", "story", "faq", "contact"]);
  });

  it("never lists the founder card, whose rows live in Home's founder card (no page, no nav link)", () => {
    expect(FOUNDER_CARD_SECTION).toBe("founder_card");
    expect(publishedPages([section("founder_card"), section("faq")])).toEqual(["faq"]);
    expect(PAGE_SECTIONS).not.toContain(FOUNDER_CARD_SECTION);
  });
});
