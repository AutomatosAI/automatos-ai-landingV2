/**
 * Present mode's slide size (W3-02): the whole slide on screen, as large as
 * it fits both ways (contain), centred by the stage. Pure: use-box-size.ts
 * measures the stage, the loaded page gives its own size.
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Until the first slide has loaded its own size, assume the usual 16:9. */
export const ASSUMED_SLIDE: Size = Object.freeze({ width: 16, height: 9 });

function hasArea(size: Size): boolean {
  return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}

/** The scale that shows the whole page inside the box (contain); null while either has no area. */
export function fitScreen(page: Size, box: Size): number | null {
  if (!hasArea(page) || !hasArea(box)) return null;
  return Math.min(box.width / page.width, box.height / page.height);
}

/** The slide's width in whole pixels for that scale; null until the stage has room. */
export function slideWidth(page: Size | null, box: Size | null): number | null {
  if (!box) return null;
  const slide = page && hasArea(page) ? page : ASSUMED_SLIDE;
  const scale = fitScreen(slide, box);
  if (scale === null) return null;
  const width = Math.floor(slide.width * scale);
  return width >= 1 ? width : null;
}
