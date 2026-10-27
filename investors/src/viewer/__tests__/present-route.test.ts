import { describe, expect, it } from "vitest";

import { FADE_MS, BAR_FADE, SLIDE_FADE } from "../present-motion";
import { isPresentRequested, PRESENT_PARAM, presentPath, withoutPresent } from "../present-route";

const ID = "00000000-0000-4000-8000-0000000000d1";

describe("present mode's address", () => {
  it("is the viewer's path with ?present=1", () => {
    expect(PRESENT_PARAM).toBe("present");
    expect(presentPath(ID)).toBe(`/documents/${ID}?present=1`);
  });

  it("is requested by present=1 only", () => {
    expect(isPresentRequested(new URLSearchParams("present=1"))).toBe(true);
    expect(isPresentRequested(new URLSearchParams("a=b&present=1"))).toBe(true);
    expect(isPresentRequested(new URLSearchParams("present=0"))).toBe(false);
    expect(isPresentRequested(new URLSearchParams("present"))).toBe(false);
    expect(isPresentRequested(new URLSearchParams(""))).toBe(false);
  });

  it("drops the parameter on a copy, keeping the rest", () => {
    const params = new URLSearchParams("a=b&present=1");
    const next = withoutPresent(params);
    expect(next.toString()).toBe("a=b");
    expect(params.toString()).toBe("a=b&present=1");
  });
});

describe("present mode's motion", () => {
  it("fades for at most 150 ms, and only when the system allows motion", () => {
    expect(FADE_MS).toBeLessThanOrEqual(150);
    for (const classes of [SLIDE_FADE, BAR_FADE]) {
      for (const name of classes.split(" ")) expect(name.startsWith("motion-safe:")).toBe(true);
      expect(classes).toContain(`duration-${FADE_MS}`);
    }
  });
});
