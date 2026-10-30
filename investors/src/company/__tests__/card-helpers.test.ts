import { describe, expect, it } from "vitest";

import { FOUNDER, type Founder } from "../company-data";
import { contactRowKind, founderRows, isContactAddress, type ContactRow } from "../contact-rows";
import { addressSegments, displayAddress } from "../link-address";

/* Invented (KP5): a number from the UK's drama range, and example addresses. */
const PHONE_ROW: ContactRow = { text: "+44 7700 900123", href: "tel:+447700900123", label: "Mobile" };
const SITE_ROW: ContactRow = { text: "example.com/someone", href: "https://example.com/someone", label: "Site" };
const WITH_LINKEDIN: Founder = { ...FOUNDER, linkedinUrl: "https://www.linkedin.com/in/someone-example/" };

describe("displayAddress", () => {
  it("drops the scheme and any trailing slash", () => {
    expect(displayAddress("https://studio.automatos.app")).toBe("studio.automatos.app");
    expect(displayAddress("https://studio.automatos.app/")).toBe("studio.automatos.app");
    expect(displayAddress("https://github.com/AutomatosAI/automatos-go")).toBe("github.com/AutomatosAI/automatos-go");
    expect(displayAddress("http://example.com/a/")).toBe("example.com/a");
  });
});

describe("addressSegments", () => {
  it("keeps each slash on the segment before it, so a line breaks only after one", () => {
    expect(addressSegments("github.com/AutomatosAI/automatos-go")).toEqual({
      head: ["github.com/", "AutomatosAI/"],
      last: "automatos-go",
    });
  });

  it("is all one segment for a bare host", () => {
    expect(addressSegments("academy.automatos.app")).toEqual({ head: [], last: "academy.automatos.app" });
  });
});

describe("isContactAddress", () => {
  it("allows https, mailto and tel", () => {
    for (const href of ["https://example.com", "mailto:someone@example.com", "tel:+447700900123"]) {
      expect(isContactAddress(href), href).toBe(true);
    }
  });

  it("refuses every other scheme, and what is no address at all", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,hi", "http://example.com", "/contact", "", "not an address"]) {
      expect(isContactAddress(href), href).toBe(false);
    }
  });
});

describe("contactRowKind", () => {
  it("reads the icon from the address", () => {
    expect(contactRowKind("mailto:someone@example.com")).toBe("email");
    expect(contactRowKind("tel:+447700900123")).toBe("phone");
    expect(contactRowKind("https://example.com")).toBe("web");
  });
});

describe("founderRows", () => {
  it("is the work email alone while LinkedIn is unset and no rows are given", () => {
    expect(founderRows(FOUNDER)).toEqual([
      { text: "gerard@automatos.app", href: "mailto:gerard@automatos.app", label: "Work" },
    ]);
  });

  it("puts the given rows after the email row, then LinkedIn once set", () => {
    const rows = founderRows(WITH_LINKEDIN, [PHONE_ROW, SITE_ROW]);
    expect(rows.map((row) => row.label)).toEqual(["Work", "Mobile", "Site", "LinkedIn"]);
    expect(rows[3]).toEqual({
      text: "www.linkedin.com/in/someone-example",
      href: "https://www.linkedin.com/in/someone-example/",
      label: "LinkedIn",
    });
  });

  it("drops a given row whose address is not https, mailto or tel", () => {
    const unsafe: ContactRow = { text: "Click", href: "javascript:alert(1)", label: "Bad" };
    expect(founderRows(FOUNDER, [unsafe, PHONE_ROW]).map((row) => row.label)).toEqual(["Work", "Mobile"]);
  });

  it("returns a new list and leaves the given one as it was", () => {
    const given: readonly ContactRow[] = Object.freeze([PHONE_ROW]);
    const rows = founderRows(FOUNDER, given);
    expect(rows).not.toBe(given);
    expect(given).toEqual([PHONE_ROW]);
  });
});
