import { describe, expect, it } from "vitest";

import { section } from "@/sections/__tests__/fixtures";
import { investorDocument } from "@/test/fixtures";

import { founderCardRows, quickAccessTiles, type QuickAccessData, type QuickAccessTile } from "../home-model";

/*
 * Home's quick-access rules (PRD-003 §3.2 item 3, US-306): which tiles show
 * for which data, and where each goes. Labels, hints and routes are written
 * out here, so the tiles are checked against the PRD, not against themselves.
 */

const DECK = investorDocument({ id: "00000000-0000-4000-8000-0000000000d1", title: "Example deck", category: "Pitch" });
const VIDEO = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d7",
  title: "Example pitch video",
  category: " pitch ",
  kind: "video",
  fileName: "example-pitch.mp4",
  contentType: "video/mp4",
  pageCount: null,
});
const MODEL = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d3",
  title: "Example model",
  category: "Business model",
  kind: "spreadsheet",
  pageCount: null,
});
/** A video outside the pitch: it is no demo tile, as it is not the pitch block's video. */
const OTHER_VIDEO = investorDocument({
  id: "00000000-0000-4000-8000-0000000000d4",
  title: "Example product walk-through",
  category: "Product",
  kind: "video",
  pageCount: null,
});

/* Invented (KP5): an address on an example domain, and a number from the UK's drama range. */
const BOOKING = "https://card.example/someone";
const PHONE_LINE = "- [+44 7700 900123](tel:+447700900123) Mobile";
const SITE_LINE = "- [example.com/someone](https://example.com/someone) Site";

const PAGES = [section("team"), section("faq"), section("contact")];

const NOTHING: QuickAccessData = { documents: null, sections: null, bookingUrl: null };

const tiles = (data: Partial<QuickAccessData>) => quickAccessTiles({ ...NOTHING, ...data });
const keys = (list: readonly QuickAccessTile[]) => list.map((tile) => tile.key);
const tileFor = (list: readonly QuickAccessTile[], key: QuickAccessTile["key"]) => list.find((tile) => tile.key === key);

describe("quickAccessTiles: the deck, the demo and Documents", () => {
  it("shows all three for a 'Pitch' PDF and video, linked as the pitch block and the library link them", () => {
    const list = tiles({ documents: [MODEL, DECK, VIDEO] });
    expect(list).toEqual([
      { key: "deck", label: "View the deck", hint: "Slideshow", href: `/documents/${DECK.id}?present=1`, external: false },
      { key: "demo", label: "Play the demo", hint: "Video", href: `/documents/${VIDEO.id}`, external: false },
      { key: "documents", label: "Documents", hint: "Library", href: "/documents", external: false },
    ]);
  });

  it("shows the deck without the demo, or the demo without the deck, as the list has them", () => {
    expect(keys(tiles({ documents: [DECK, MODEL] }))).toEqual(["deck", "documents"]);
    expect(keys(tiles({ documents: [VIDEO] }))).toEqual(["demo", "documents"]);
  });

  it("shows Documents alone when no 'Pitch' document is a PDF or a video", () => {
    expect(keys(tiles({ documents: [MODEL, OTHER_VIDEO] }))).toEqual(["documents"]);
  });

  it("shows none of them when nothing is published", () => {
    expect(tiles({ documents: [] })).toEqual([]);
  });

  it("shows none of them while the list loads or while storage is down (no list); the others stay", () => {
    expect(keys(tiles({ documents: null, sections: PAGES }))).toEqual(["team", "faq", "bookCall"]);
  });
});

describe("quickAccessTiles: Team and FAQ", () => {
  it("shows each only once published, Team before FAQ whatever the admins' order", () => {
    expect(tileFor(tiles({ sections: [section("team")] }), "team")).toEqual({
      key: "team",
      label: "Team",
      hint: "Page",
      href: "/team",
      external: false,
    });
    expect(keys(tiles({ sections: [section("faq")] }))).toEqual(["faq"]);
    expect(keys(tiles({ sections: [section("faq"), section("team")] }))).toEqual(["team", "faq"]);
    expect(tileFor(tiles({ sections: [section("faq")] }), "faq")?.href).toBe("/faq");
  });

  it("shows a published page with no text yet, as the sidebar links it (the page says Coming soon.)", () => {
    expect(keys(tiles({ sections: [section("team", { bodyMd: "" })] }))).toEqual(["team"]);
  });

  it("shows neither while the sections load or when they cannot be read", () => {
    expect(keys(tiles({ documents: [MODEL] }))).toEqual(["documents"]);
  });

  it("makes no tile of the overview or the founder card", () => {
    expect(tiles({ sections: [section("overview"), section("founder_card", { bodyMd: PHONE_LINE })] })).toEqual([]);
  });
});

describe("quickAccessTiles: Book a call", () => {
  it("opens the booking page with the portal's ref tag, in a new tab, once its address is set", () => {
    for (const sections of [null, [], PAGES]) {
      expect(tileFor(tiles({ sections, bookingUrl: BOOKING }), "bookCall")).toEqual({
        key: "bookCall",
        label: "Book a call",
        hint: "Tappal ↗",
        href: "https://card.example/someone?ref=portal",
        external: true,
      });
    }
  });

  it("goes to the Contact page while the address is null and Contact is published", () => {
    expect(tileFor(tiles({ sections: [section("contact")] }), "bookCall")).toEqual({
      key: "bookCall",
      label: "Book a call",
      hint: "Contact page",
      href: "/contact",
      external: false,
    });
  });

  it("is hidden while the address is null and Contact is unpublished, or the sections cannot be read", () => {
    expect(keys(tiles({ sections: [section("team"), section("faq")] }))).toEqual(["team", "faq"]);
    expect(tiles({ sections: [] })).toEqual([]);
    expect(tiles({ sections: null })).toEqual([]);
  });
});

describe("quickAccessTiles: all six", () => {
  it("lists the deck, the demo, Documents, Team, FAQ and Book a call, in that order", () => {
    const list = tiles({ documents: [DECK, VIDEO, MODEL], sections: [section("contact"), section("faq"), section("team")] });
    expect(list.map(({ label, hint }) => [label, hint])).toEqual([
      ["View the deck", "Slideshow"],
      ["Play the demo", "Video"],
      ["Documents", "Library"],
      ["Team", "Page"],
      ["FAQ", "Page"],
      ["Book a call", "Contact page"],
    ]);
    expect(list.filter((tile) => tile.external)).toEqual([]);
  });

  it("returns a frozen list of frozen tiles", () => {
    const list = tiles({ documents: [DECK], sections: PAGES, bookingUrl: BOOKING });
    expect(Object.isFrozen(list)).toBe(true);
    expect(list.every((tile) => Object.isFrozen(tile))).toBe(true);
  });
});

describe("founderCardRows", () => {
  it("reads the published founder_card section's rows, in its order", () => {
    const sections = [section("overview"), section("founder_card", { bodyMd: `${PHONE_LINE}\n${SITE_LINE}` })];
    expect(founderCardRows(sections)).toEqual([
      { text: "+44 7700 900123", href: "tel:+447700900123", label: "Mobile" },
      { text: "example.com/someone", href: "https://example.com/someone", label: "Site" },
    ]);
  });

  it("has none while the sections load or cannot be read, or while the section is unpublished", () => {
    expect(founderCardRows(null)).toEqual([]);
    expect(founderCardRows([section("overview"), section("contact")])).toEqual([]);
  });

  it("has none for a published section that is empty or holds no row", () => {
    expect(founderCardRows([section("founder_card", { bodyMd: "" })])).toEqual([]);
    expect(founderCardRows([section("founder_card", { bodyMd: "Call me on the number below." })])).toEqual([]);
  });
});
