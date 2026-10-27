import { describe, expect, it } from "vitest";

import { strings } from "@/strings";

import { portalNav } from "../nav";

const nav = strings.nav;
const INVESTOR = { isAdmin: false, profileComplete: true } as const;

describe("portalNav with published sections (US-009)", () => {
  it("adds Team, FAQ and Contact between Documents and Profile, each active only on its own page", () => {
    const items = portalNav(INVESTOR, ["team", "faq", "contact"]);
    expect(items.map((item) => [item.label, item.to, item.end])).toEqual([
      [nav.home, "/", true],
      [nav.documents, "/documents", false],
      [nav.team, "/team", true],
      [nav.faq, "/faq", true],
      [nav.contact, "/contact", true],
      [nav.profile, "/profile", true],
    ]);
  });

  it("keeps the sidebar's order whatever order the sections come in", () => {
    const labels = portalNav(INVESTOR, ["contact", "team"]).map((item) => item.label);
    expect(labels).toEqual([nav.home, nav.documents, nav.team, nav.contact, nav.profile]);
  });

  it("keeps Admin last for an admin", () => {
    const items = portalNav({ isAdmin: true, profileComplete: true }, ["faq"]);
    expect(items.map((item) => item.label)).toEqual([nav.home, nav.documents, nav.faq, nav.profile, nav.admin]);
  });

  it("gives no links before the profile is done, sections or not", () => {
    expect(portalNav({ isAdmin: true, profileComplete: false }, ["team", "faq", "contact"])).toEqual([]);
  });
});
