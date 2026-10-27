import { describe, expect, it } from "vitest";

import { isMood, MOOD_STORAGE_KEY, resolveMood } from "../mood";

describe("resolveMood", () => {
  it("uses the saved mood over the system scheme", () => {
    expect(resolveMood({ stored: "bone", prefersDark: true })).toBe("bone");
    expect(resolveMood({ stored: "pitch", prefersDark: false })).toBe("pitch");
  });

  it("follows the system scheme when nothing is saved", () => {
    expect(resolveMood({ stored: null, prefersDark: true })).toBe("pitch");
    expect(resolveMood({ stored: null, prefersDark: false })).toBe("bone");
  });

  it("ignores a saved value that is not one of the two moods", () => {
    expect(resolveMood({ stored: "mist", prefersDark: false })).toBe("bone");
    expect(resolveMood({ stored: "PITCH", prefersDark: false })).toBe("bone");
    expect(resolveMood({ stored: "", prefersDark: true })).toBe("pitch");
  });

  it("reads the site's storage key", () => {
    expect(MOOD_STORAGE_KEY).toBe("automatos-mood");
  });
});

describe("isMood", () => {
  it("accepts bone and pitch only", () => {
    expect(isMood("bone")).toBe(true);
    expect(isMood("pitch")).toBe(true);
    expect(isMood("pine")).toBe(false);
    expect(isMood(null)).toBe(false);
    expect(isMood(1)).toBe(false);
  });
});
