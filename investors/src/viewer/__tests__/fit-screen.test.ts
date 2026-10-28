import { describe, expect, it } from "vitest";

import { ASSUMED_SLIDE, fitScreen, slideWidth } from "../fit-screen";

const LAPTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const PHONE_LANDSCAPE = { width: 844, height: 390 };
const WIDE_SLIDE = { width: 960, height: 540 };
const A4 = { width: 595, height: 842 };

describe("fitScreen", () => {
  it("fits a wide slide to the width when the box is relatively taller", () => {
    expect(fitScreen(WIDE_SLIDE, LAPTOP)).toBeCloseTo(1280 / 960);
    expect(fitScreen(WIDE_SLIDE, PHONE)).toBeCloseTo(390 / 960);
  });

  it("fits it to the height when the box is relatively wider", () => {
    expect(fitScreen(WIDE_SLIDE, PHONE_LANDSCAPE)).toBeCloseTo(390 / 540);
    expect(fitScreen(A4, LAPTOP)).toBeCloseTo(800 / 842);
  });

  it("shows the whole page: neither side ever overflows the box", () => {
    for (const page of [WIDE_SLIDE, A4, { width: 1000, height: 1000 }]) {
      for (const box of [LAPTOP, PHONE, PHONE_LANDSCAPE]) {
        const scale = fitScreen(page, box) ?? 0;
        expect(page.width * scale).toBeLessThanOrEqual(box.width + 1e-9);
        expect(page.height * scale).toBeLessThanOrEqual(box.height + 1e-9);
      }
    }
  });

  it("is null while either has no area", () => {
    expect(fitScreen(WIDE_SLIDE, { width: 0, height: 800 })).toBeNull();
    expect(fitScreen({ width: 960, height: 0 }, LAPTOP)).toBeNull();
    expect(fitScreen(WIDE_SLIDE, { width: Number.NaN, height: 800 })).toBeNull();
  });
});

describe("slideWidth", () => {
  it("gives the slide's width in whole pixels", () => {
    expect(slideWidth(WIDE_SLIDE, LAPTOP)).toBe(1280);
    expect(slideWidth(WIDE_SLIDE, PHONE_LANDSCAPE)).toBe(Math.floor(960 * (390 / 540)));
    expect(slideWidth(A4, LAPTOP)).toBe(Math.floor(595 * (800 / 842)));
  });

  it("assumes 16:9 until the slide has loaded its own size", () => {
    expect(ASSUMED_SLIDE).toEqual({ width: 16, height: 9 });
    expect(slideWidth(null, PHONE)).toBe(390);
    expect(slideWidth(null, { width: 1000, height: 450 })).toBe(800);
    expect(slideWidth({ width: 0, height: 0 }, PHONE)).toBe(390);
  });

  it("is null until the stage has room", () => {
    expect(slideWidth(WIDE_SLIDE, null)).toBeNull();
    expect(slideWidth(WIDE_SLIDE, { width: 0, height: 0 })).toBeNull();
    expect(slideWidth(WIDE_SLIDE, { width: 0.5, height: 0.5 })).toBeNull();
  });
});
