import { describe, expect, it } from "vitest";

import { MAX_VERSION, adminDocumentStatsPath, parseVersion, versionSearch } from "../document-stats-paths";

describe("the stats page's address", () => {
  it("sits under the document's admin path", () => {
    expect(adminDocumentStatsPath("00000000-0000-4000-8000-0000000000d1")).toBe(
      "/admin/documents/00000000-0000-4000-8000-0000000000d1/stats",
    );
    expect(adminDocumentStatsPath("a/b")).toBe("/admin/documents/a%2Fb/stats");
  });

  it("reads ?version as a whole number the server accepts, else the current version", () => {
    expect(parseVersion("1")).toBe(1);
    expect(parseVersion("12")).toBe(12);
    expect(parseVersion(String(MAX_VERSION))).toBe(MAX_VERSION);
    for (const value of [null, "", "0", "01", "-1", "1.5", "1e3", " 2", "two", String(MAX_VERSION + 1), "99999999999"]) {
      expect(parseVersion(value)).toBeNull();
    }
  });

  it("keeps the current version out of the address", () => {
    expect(versionSearch(2, 2)).toEqual({});
    expect(versionSearch(1, 2)).toEqual({ version: "1" });
  });
});
