import { describe, expect, it } from "vitest";

import { findSection, PAGE_SECTIONS, publishedPages, readableSection } from "../sections-model";

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

  it("keeps a published page with no text yet (its page says Coming soon)", () => {
    expect(publishedPages([section("faq", { bodyMd: "" })])).toEqual(["faq"]);
  });

  it("never lists the overview, which lives on the home page", () => {
    expect(publishedPages([section("overview")])).toEqual([]);
    expect(PAGE_SECTIONS).toEqual(["team", "faq", "contact"]);
  });
});
