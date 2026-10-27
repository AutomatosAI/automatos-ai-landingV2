import { describe, expect, it } from "vitest";

import { anchorFactsOf, anchorOf, leavesPage, type AnchorFacts, type ClickFacts } from "../leave-guard";

const HERE = "https://automatos.app/investors/admin/sections/team";
const PLAIN: ClickFacts = { button: 0, modified: false, defaultPrevented: false };
const link = (href: string, extra: Partial<AnchorFacts> = {}): AnchorFacts => ({ href, target: "", download: false, ...extra });

describe("leavesPage", () => {
  it("is true for a plain click on a link to another page of the app or the site", () => {
    expect(leavesPage(PLAIN, link("/investors/admin/sections"), HERE)).toBe(true);
    expect(leavesPage(PLAIN, link("/investors/team"), HERE)).toBe(true);
    expect(leavesPage(PLAIN, link("/"), HERE)).toBe(true);
    expect(leavesPage(PLAIN, link("https://example.com/"), HERE)).toBe(true);
    expect(leavesPage(PLAIN, link("/investors/admin/sections/team?view=1"), HERE)).toBe(true);
  });

  it("is true for targets that load in this tab", () => {
    expect(leavesPage(PLAIN, link("/", { target: "_self" }), HERE)).toBe(true);
    expect(leavesPage(PLAIN, link("/", { target: "_top" }), HERE)).toBe(true);
  });

  it("is false for a link to this same page, or a jump within it", () => {
    expect(leavesPage(PLAIN, link(HERE), HERE)).toBe(false);
    expect(leavesPage(PLAIN, link("/investors/admin/sections/team#preview"), HERE)).toBe(false);
    expect(leavesPage(PLAIN, link(""), HERE)).toBe(false);
  });

  it("is false when the link opens elsewhere: a new tab, a download, a modifier key, another button", () => {
    expect(leavesPage(PLAIN, link("/", { target: "_blank" }), HERE)).toBe(false);
    expect(leavesPage(PLAIN, link("/file.pdf", { download: true }), HERE)).toBe(false);
    expect(leavesPage({ ...PLAIN, modified: true }, link("/"), HERE)).toBe(false);
    expect(leavesPage({ ...PLAIN, button: 1 }, link("/"), HERE)).toBe(false);
  });

  it("is false for links that do not load a page: mailto:, tel:, javascript:", () => {
    expect(leavesPage(PLAIN, link("mailto:hello@automatos.app"), HERE)).toBe(false);
    expect(leavesPage(PLAIN, link("tel:+10000000000"), HERE)).toBe(false);
    expect(leavesPage(PLAIN, link("javascript:void(0)"), HERE)).toBe(false);
  });

  it("is false when something already cancelled the click, or the address cannot be read", () => {
    expect(leavesPage({ ...PLAIN, defaultPrevented: true }, link("/"), HERE)).toBe(false);
    expect(leavesPage(PLAIN, link("http://[bad"), HERE)).toBe(false);
  });
});

describe("anchorOf and anchorFactsOf", () => {
  it("finds the link around the element clicked, and only a link with an address", () => {
    const anchor = document.createElement("a");
    anchor.setAttribute("href", "/investors/team");
    anchor.target = "_blank";
    const icon = document.createElement("span");
    anchor.append(icon);
    expect(anchorOf(icon)).toBe(anchor);
    expect(anchorFactsOf(anchor)).toEqual({ href: "/investors/team", target: "_blank", download: false });
    expect(anchorOf(document.createElement("a"))).toBeNull();
    expect(anchorOf(document.createElement("button"))).toBeNull();
    expect(anchorOf(null)).toBeNull();
  });
});
