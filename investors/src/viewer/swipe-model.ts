/**
 * Present mode's touch (W3-02): a sideways swipe of 50 px or more turns the
 * slide, a tap on the right or left third of the slide's area turns it too.
 * Pure: use-slide-gestures.ts feeds it where a pointer went down and came up.
 */

/** A swipe covers at least this far sideways. */
export const SWIPE_MIN_PX = 50;
/** Moving less than this both ways is a tap, not a swipe. */
export const TAP_MAX_PX = 10;

export type GestureMove = "next" | "back" | "none";

/**
 * A finger moved (dx, dy): to the left goes next, to the right goes back.
 * Shorter than the threshold, or more up-and-down than sideways, is nothing.
 */
export function swipeMove(dx: number, dy: number): GestureMove {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return "none";
  if (Math.abs(dx) < SWIPE_MIN_PX) return "none";
  if (Math.abs(dy) >= Math.abs(dx)) return "none";
  return dx < 0 ? "next" : "back";
}

export function isTap(dx: number, dy: number): boolean {
  return Math.abs(dx) < TAP_MAX_PX && Math.abs(dy) < TAP_MAX_PX;
}

/** A tap `x` px into an area `width` wide: the right third goes next, the left third back, the middle shows the bar. */
export function tapMove(x: number, width: number): GestureMove {
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return "none";
  const third = width / 3;
  if (x < third) return "back";
  if (x >= width - third) return "next";
  return "none";
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The slide's area on screen, horizontally. */
export interface Span {
  readonly left: number;
  readonly width: number;
}

/** One pointer from down to up over the slide's area: a tap by where it landed, else a swipe by how far it went. */
export function gestureMove(down: Point, up: Point, area: Span): GestureMove {
  const dx = up.x - down.x;
  const dy = up.y - down.y;
  if (isTap(dx, dy)) return tapMove(up.x - area.left, area.width);
  return swipeMove(dx, dy);
}
