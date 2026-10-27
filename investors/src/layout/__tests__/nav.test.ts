import { describe, expect, it } from "vitest";

import { strings } from "@/strings";

import { portalNav } from "../nav";

const labels = (items: ReturnType<typeof portalNav>) => items.map((item) => item.label);
const nav = strings.nav;

describe("portalNav", () => {
  it("gives an investor Home, Documents and Profile", () => {
    const items = portalNav({ isAdmin: false, profileComplete: true });
    expect(labels(items)).toEqual([nav.home, nav.documents, nav.profile]);
    expect(items.map((item) => item.to)).toEqual(["/", "/documents", "/profile"]);
  });

  it("adds Admin for an admin", () => {
    const items = portalNav({ isAdmin: true, profileComplete: true });
    expect(labels(items)).toEqual([nav.home, nav.documents, nav.profile, nav.admin]);
    expect(items.at(-1)?.to).toBe("/admin");
  });

  it("gives no links before the profile is done", () => {
    expect(portalNav({ isAdmin: false, profileComplete: false })).toEqual([]);
    expect(portalNav({ isAdmin: true, profileComplete: false })).toEqual([]);
  });

  it("marks Home active only on its own path; Documents and Admin stay active below theirs", () => {
    const items = portalNav({ isAdmin: true, profileComplete: true });
    expect(items.map((item) => [item.to, item.end])).toEqual([
      ["/", true],
      ["/documents", false],
      ["/profile", true],
      ["/admin", false],
    ]);
  });
});
