import { describe, expect, it } from "vitest";

import { isExternalHref, isSiteAddress, LINK_REL, linkAttributes } from "../markdown-links";

const ORIGIN = "https://automatos.app";

describe("isExternalHref", () => {
  it.each([
    ["https://booking.example.com/call", true],
    ["http://example.com", true],
    ["//example.com/path", true],
    ["https://automatos.app/privacy", false],
    ["/investors/documents", false],
    ["#faq", false],
    ["mailto:hello@automatos.app", false],
    ["tel:+3531234567", false],
    ["", false],
    [undefined, false],
  ])("%s → %s", (href, external) => {
    expect(isExternalHref(href, ORIGIN)).toBe(external);
  });

  it("treats another port or scheme on the same host as another site", () => {
    expect(isExternalHref("http://automatos.app/", ORIGIN)).toBe(true);
    expect(isExternalHref("https://automatos.app:8443/", ORIGIN)).toBe(true);
  });
});

describe("linkAttributes", () => {
  it("adds target _blank only for another site; rel always", () => {
    expect(linkAttributes("https://example.com", ORIGIN)).toEqual({ rel: LINK_REL, target: "_blank" });
    expect(linkAttributes("/privacy", ORIGIN)).toEqual({ rel: LINK_REL });
    expect(LINK_REL).toBe("noopener noreferrer");
  });
});

describe("isSiteAddress", () => {
  it.each([
    ["/images/team.jpg", true],
    ["images/team.jpg", true],
    ["https://automatos.app/images/team.jpg", true],
    ["https://images.example.com/team.jpg", false],
    ["//images.example.com/team.jpg", false],
    ["http://automatos.app/images/team.jpg", false],
    ["", false],
    [undefined, false],
  ])("%s → %s", (address, site) => {
    expect(isSiteAddress(address, ORIGIN)).toBe(site);
  });
});
