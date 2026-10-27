import { describe, expect, it } from "vitest";

import { isControl, isField, moveSlide, presentAction, type PresentKeyPress } from "../present-keys";

const press = (overrides: Partial<PresentKeyPress>): PresentKeyPress => ({
  key: "ArrowRight",
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  defaultPrevented: false,
  inField: false,
  onControl: false,
  ...overrides,
});

describe("presentAction", () => {
  it.each([
    ["ArrowRight", "next"],
    ["PageDown", "next"],
    [" ", "next"],
    ["Enter", "next"],
    ["ArrowLeft", "back"],
    ["PageUp", "back"],
    ["Backspace", "back"],
    ["Home", "first"],
    ["End", "last"],
    ["Escape", "exit"],
  ])("%j goes %s", (key, action) => {
    expect(presentAction(press({ key }))).toBe(action);
  });

  it("leaves every other key alone", () => {
    expect(presentAction(press({ key: "ArrowUp" }))).toBeNull();
    expect(presentAction(press({ key: "ArrowDown" }))).toBeNull();
    expect(presentAction(press({ key: "Tab" }))).toBeNull();
    expect(presentAction(press({ key: "a" }))).toBeNull();
  });

  it("leaves keys with a modifier, already handled, or typed into a field", () => {
    expect(presentAction(press({ altKey: true }))).toBeNull();
    expect(presentAction(press({ ctrlKey: true }))).toBeNull();
    expect(presentAction(press({ metaKey: true }))).toBeNull();
    expect(presentAction(press({ shiftKey: true }))).toBeNull();
    expect(presentAction(press({ defaultPrevented: true }))).toBeNull();
    expect(presentAction(press({ key: "Backspace", inField: true }))).toBeNull();
  });

  it("lets a focused button or link have Enter and Space, but not the arrows or Esc", () => {
    expect(presentAction(press({ key: "Enter", onControl: true }))).toBeNull();
    expect(presentAction(press({ key: " ", onControl: true }))).toBeNull();
    expect(presentAction(press({ key: "ArrowRight", onControl: true }))).toBe("next");
    expect(presentAction(press({ key: "Escape", onControl: true }))).toBe("exit");
  });
});

describe("moveSlide", () => {
  it("steps between the first and the last slide", () => {
    expect(moveSlide(1, "next", 12)).toBe(2);
    expect(moveSlide(12, "next", 12)).toBe(12);
    expect(moveSlide(2, "back", 12)).toBe(1);
    expect(moveSlide(1, "back", 12)).toBe(1);
  });

  it("jumps to the first and the last slide", () => {
    expect(moveSlide(7, "first", 12)).toBe(1);
    expect(moveSlide(3, "last", 12)).toBe(12);
  });

  it("stays put before the count is known", () => {
    expect(moveSlide(1, "next", null)).toBe(1);
    expect(moveSlide(1, "last", null)).toBe(1);
  });
});

describe("isField and isControl", () => {
  it("tells text fields and pressable controls apart", () => {
    document.body.innerHTML = `
      <input id="field" />
      <div contenteditable="true"><span id="editable">Text</span></div>
      <button id="button"><svg id="icon"></svg></button>
      <a id="link" href="#">Link</a>
      <div id="plain">Slide</div>`;
    const byId = (id: string) => document.getElementById(id);
    expect(isField(byId("field"))).toBe(true);
    expect(isField(byId("editable"))).toBe(true);
    expect(isField(byId("button"))).toBe(false);
    expect(isControl(byId("button"))).toBe(true);
    expect(isControl(byId("icon"))).toBe(true);
    expect(isControl(byId("link"))).toBe(true);
    expect(isControl(byId("plain"))).toBe(false);
    expect(isField(window)).toBe(false);
    expect(isControl(null)).toBe(false);
    document.body.innerHTML = "";
  });
});
