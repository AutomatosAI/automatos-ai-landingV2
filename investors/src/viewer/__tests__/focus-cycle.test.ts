import { describe, expect, it } from "vitest";

import { nextFocusStop, type FocusStop } from "../focus-cycle";

const CONTAINER = -1;

/** Stops named by letter; an upper-case letter is a disabled control. */
const stops = (names: string): ReadonlyArray<FocusStop<string>> =>
  Array.from(names, (name) => ({ target: name.toLowerCase(), disabled: name !== name.toLowerCase() }));

describe("nextFocusStop", () => {
  it("moves forward and wraps from the last stop to the first", () => {
    expect(nextFocusStop(stops("abc"), 0, false)).toBe("b");
    expect(nextFocusStop(stops("abc"), 2, false)).toBe("a");
  });

  it("moves backward and wraps from the first stop to the last", () => {
    expect(nextFocusStop(stops("abc"), 2, true)).toBe("b");
    expect(nextFocusStop(stops("abc"), 0, true)).toBe("c");
  });

  it("starts from the container: Tab to the first stop, Shift+Tab to the last", () => {
    expect(nextFocusStop(stops("abc"), CONTAINER, false)).toBe("a");
    expect(nextFocusStop(stops("abc"), CONTAINER, true)).toBe("c");
  });

  it("treats an index outside the list as the container", () => {
    expect(nextFocusStop(stops("abc"), 7, false)).toBe("a");
    expect(nextFocusStop(stops("abc"), 7, true)).toBe("c");
  });

  it("keeps a single stop where it is, either way", () => {
    expect(nextFocusStop(stops("a"), 0, false)).toBe("a");
    expect(nextFocusStop(stops("a"), 0, true)).toBe("a");
    expect(nextFocusStop(stops("a"), CONTAINER, true)).toBe("a");
  });

  it("finds nothing when no stop is enabled", () => {
    expect(nextFocusStop(stops(""), CONTAINER, false)).toBeNull();
    expect(nextFocusStop(stops(""), CONTAINER, true)).toBeNull();
    expect(nextFocusStop(stops("AB"), CONTAINER, false)).toBeNull();
    expect(nextFocusStop(stops("AB"), CONTAINER, true)).toBeNull();
  });

  it("passes disabled controls by, at the ends too", () => {
    expect(nextFocusStop(stops("AbCd"), CONTAINER, false)).toBe("b");
    expect(nextFocusStop(stops("AbCd"), 1, false)).toBe("d");
    expect(nextFocusStop(stops("AbCd"), 3, false)).toBe("b");
    expect(nextFocusStop(stops("AbCd"), 1, true)).toBe("d");
    expect(nextFocusStop(stops("aBcD"), CONTAINER, true)).toBe("c");
  });

  it("leaves its input as it was", () => {
    const list = stops("abc");
    const before = JSON.stringify(list);
    nextFocusStop(list, 1, false);
    expect(JSON.stringify(list)).toBe(before);
  });
});
