import { describe, expect, it } from "vitest";

import { arrowStep, fitWidth, isInOwnWidget, MAX_PAGE_WIDTH, stepPage, type KeyPress } from "../page-model";

describe("stepPage", () => {
  it("moves between the first and the last page", () => {
    expect(stepPage(1, 1, 12)).toBe(2);
    expect(stepPage(2, -1, 12)).toBe(1);
    expect(stepPage(1, -1, 12)).toBe(1);
    expect(stepPage(12, 1, 12)).toBe(12);
  });

  it("stays put before the page count is known", () => {
    expect(stepPage(1, 1, null)).toBe(1);
    expect(stepPage(1, -1, null)).toBe(1);
  });
});

describe("fitWidth", () => {
  it("fits a phone exactly (390 px less the gutters and the frame)", () => {
    expect(fitWidth(340)).toBe(340);
    expect(fitWidth(339.6)).toBe(339);
  });

  it("caps wide screens", () => {
    expect(MAX_PAGE_WIDTH).toBe(900);
    expect(fitWidth(1400)).toBe(900);
  });

  it("is null until there is room", () => {
    expect(fitWidth(0)).toBeNull();
    expect(fitWidth(0.5)).toBeNull();
    expect(fitWidth(Number.NaN)).toBeNull();
  });
});

describe("arrowStep", () => {
  const press = (overrides: Partial<KeyPress>): KeyPress => ({
    key: "ArrowRight",
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    defaultPrevented: false,
    inOwnWidget: false,
    ...overrides,
  });

  it("turns the page with the bare left and right arrows", () => {
    expect(arrowStep(press({ key: "ArrowRight" }))).toBe(1);
    expect(arrowStep(press({ key: "ArrowLeft" }))).toBe(-1);
  });

  it("leaves every other key alone", () => {
    expect(arrowStep(press({ key: "ArrowUp" }))).toBeNull();
    expect(arrowStep(press({ key: "ArrowDown" }))).toBeNull();
    expect(arrowStep(press({ key: "Enter" }))).toBeNull();
  });

  it("leaves arrows with a modifier, already handled, or in a field, menu or dialog", () => {
    expect(arrowStep(press({ altKey: true }))).toBeNull();
    expect(arrowStep(press({ ctrlKey: true }))).toBeNull();
    expect(arrowStep(press({ metaKey: true }))).toBeNull();
    expect(arrowStep(press({ shiftKey: true }))).toBeNull();
    expect(arrowStep(press({ defaultPrevented: true }))).toBeNull();
    expect(arrowStep(press({ inOwnWidget: true }))).toBeNull();
  });
});

describe("isInOwnWidget", () => {
  it("is a field, or anything inside a menu or dialog", () => {
    document.body.innerHTML = `
      <input id="field" />
      <div role="menu"><button id="item">Item</button></div>
      <div role="dialog"><a id="link" href="#">Link</a></div>
      <button id="plain">Next</button>`;
    expect(isInOwnWidget(document.getElementById("field"))).toBe(true);
    expect(isInOwnWidget(document.getElementById("item"))).toBe(true);
    expect(isInOwnWidget(document.getElementById("link"))).toBe(true);
    expect(isInOwnWidget(document.getElementById("plain"))).toBe(false);
    expect(isInOwnWidget(document.body)).toBe(false);
    expect(isInOwnWidget(window)).toBe(false);
    expect(isInOwnWidget(null)).toBe(false);
    document.body.innerHTML = "";
  });
});
