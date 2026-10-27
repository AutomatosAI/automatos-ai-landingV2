/**
 * Present mode's keys (W3-02): which key moves the slideshow which way, and
 * where a move lands. Pure: use-present-keys.ts feeds it the browser's
 * keydown; the swipes and taps (swipe-model.ts) share the moves.
 */

import { stepPage } from "./page-model";

/** Where a key, a swipe or a tap takes the slideshow. */
export type SlideMove = "next" | "back" | "first" | "last";
export type PresentAction = SlideMove | "exit";

/** The parts of a keydown present mode needs. */
export interface PresentKeyPress {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly defaultPrevented: boolean;
  /** The key went to a text field: it types there. */
  readonly inField: boolean;
  /** The key went to a button or a link, which Enter and Space press. */
  readonly onControl: boolean;
}

const KEY_ACTIONS: ReadonlyMap<string, PresentAction> = new Map([
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
]);

/** The keys a focused button or link answers itself. */
const PRESS_KEYS: ReadonlySet<string> = new Set([" ", "Enter"]);

/** What a bare key does in present mode; null for every other key, or one that belongs to a field or a control. */
export function presentAction(press: PresentKeyPress): PresentAction | null {
  if (press.defaultPrevented || press.inField) return null;
  if (press.altKey || press.ctrlKey || press.metaKey || press.shiftKey) return null;
  if (press.onControl && PRESS_KEYS.has(press.key)) return null;
  return KEY_ACTIONS.get(press.key) ?? null;
}

/** The slide a move lands on, kept between 1 and the count (when known). */
export function moveSlide(page: number, move: SlideMove, pageCount: number | null): number {
  switch (move) {
    case "next":
      return stepPage(page, 1, pageCount);
    case "back":
      return stepPage(page, -1, pageCount);
    case "first":
      return 1;
    case "last":
      return pageCount ?? page;
  }
}

const FIELDS = 'input, textarea, select, [contenteditable="true"]';
const CONTROLS = 'button, a[href], [role="button"], [role="link"], summary';

export function isField(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(FIELDS) !== null;
}

export function isControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(CONTROLS) !== null;
}
