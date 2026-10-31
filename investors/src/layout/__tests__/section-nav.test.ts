import { BookOpen } from "lucide-react";
import { describe, expect, it } from "vitest";

import { strings } from "@/strings";

import { portalNav } from "../nav";

const nav = strings.nav;
const INVESTOR = { isAdmin: false, profileComplete: true } as const;

describe("portalNav with published sections (US-009)", () => {
  it("adds Team, Story, FAQ and Contact between Documents and Profile, each active only on its own page", () => {
    const items = portalNav(INVESTOR, ["team", "story", "faq", "contact"]);
    expect(items.map((item) => [item.label, item.to, item.end])).toEqual([
      [nav.home, "/", true],
      [nav.documents, "/documents", false],
      [nav.team, "/team", true],
      [nav.story, "/story", true],
      [nav.faq, "/faq", true],
      [nav.contact, "/contact", true],
      [nav.profile, "/profile", true],
    ]);
  });

  it("keeps the sidebar's order whatever order the sections come in", () => {
    const labels = portalNav(INVESTOR, ["contact", "team"]).map((item) => item.label);
    expect(labels).toEqual([nav.home, nav.documents, nav.team, nav.contact, nav.profile]);
    const withStory = portalNav(INVESTOR, ["contact", "faq", "story", "team"]).map((item) => item.label);
    expect(withStory).toEqual([nav.home, nav.documents, nav.team, nav.story, nav.faq, nav.contact, nav.profile]);
  });

  it("gives the Story no link until it is published, then the BookOpen icon", () => {
    const unpublished = portalNav(INVESTOR, ["team", "faq", "contact"]);
    expect(unpublished.map((item) => item.label)).not.toContain(nav.story);
    expect(unpublished.map((item) => item.to)).not.toContain("/story");

    const story = portalNav(INVESTOR, ["team", "story", "faq"]).find((item) => item.to === "/story");
    expect(story).toMatchObject({ label: "Story", icon: BookOpen, end: true });
  });

  it("keeps Admin last for an admin", () => {
    const items = portalNav({ isAdmin: true, profileComplete: true }, ["faq"]);
    expect(items.map((item) => item.label)).toEqual([nav.home, nav.documents, nav.faq, nav.profile, nav.admin]);
  });

  it("gives no links before the profile is done, sections or not", () => {
    expect(portalNav({ isAdmin: true, profileComplete: false }, ["team", "story", "faq", "contact"])).toEqual([]);
  });
});
