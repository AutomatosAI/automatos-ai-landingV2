import { describe, expect, it } from "vitest";

import { gestureMove, isTap, SWIPE_MIN_PX, swipeMove, TAP_MAX_PX, tapMove } from "../swipe-model";

describe("swipeMove", () => {
  it("goes next on a swipe to the left and back on one to the right, from 50 px", () => {
    expect(SWIPE_MIN_PX).toBe(50);
    expect(swipeMove(-50, 0)).toBe("next");
    expect(swipeMove(50, 0)).toBe("back");
    expect(swipeMove(-180, 30)).toBe("next");
    expect(swipeMove(120, -40)).toBe("back");
  });

  it("does nothing under 50 px sideways", () => {
    expect(swipeMove(-49, 0)).toBe("none");
    expect(swipeMove(49.9, 0)).toBe("none");
  });

  it("does nothing when the finger went more up or down than sideways", () => {
    expect(swipeMove(-60, 61)).toBe("none");
    expect(swipeMove(80, -80)).toBe("none");
    expect(swipeMove(-60, 200)).toBe("none");
  });

  it("does nothing for a gesture it cannot measure", () => {
    expect(swipeMove(Number.NaN, 0)).toBe("none");
    expect(swipeMove(-100, Number.POSITIVE_INFINITY)).toBe("none");
  });
});

describe("tapMove", () => {
  it("goes back on the left third, next on the right third, nothing in the middle", () => {
    expect(tapMove(0, 390)).toBe("back");
    expect(tapMove(129, 390)).toBe("back");
    expect(tapMove(130, 390)).toBe("none");
    expect(tapMove(259, 390)).toBe("none");
    expect(tapMove(260, 390)).toBe("next");
    expect(tapMove(389, 390)).toBe("next");
  });

  it("does nothing without an area", () => {
    expect(tapMove(10, 0)).toBe("none");
    expect(tapMove(Number.NaN, 390)).toBe("none");
  });
});

describe("gestureMove", () => {
  const area = { left: 100, width: 300 };

  it("reads a pointer that hardly moved as a tap, by where it landed in the area", () => {
    expect(TAP_MAX_PX).toBe(10);
    expect(isTap(9, -9)).toBe(true);
    expect(isTap(10, 0)).toBe(false);
    expect(gestureMove({ x: 150, y: 50 }, { x: 152, y: 51 }, area)).toBe("back");
    expect(gestureMove({ x: 250, y: 50 }, { x: 250, y: 50 }, area)).toBe("none");
    expect(gestureMove({ x: 380, y: 50 }, { x: 375, y: 55 }, area)).toBe("next");
  });

  it("reads one that travelled as a swipe", () => {
    expect(gestureMove({ x: 350, y: 50 }, { x: 250, y: 60 }, area)).toBe("next");
    expect(gestureMove({ x: 150, y: 50 }, { x: 260, y: 40 }, area)).toBe("back");
    expect(gestureMove({ x: 250, y: 50 }, { x: 270, y: 50 }, area)).toBe("none");
    expect(gestureMove({ x: 250, y: 50 }, { x: 190, y: 250 }, area)).toBe("none");
  });
});
