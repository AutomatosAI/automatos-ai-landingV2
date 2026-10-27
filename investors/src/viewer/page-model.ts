/**
 * The viewer's page arithmetic: moving between pages, the page's width
 * (fit to width, capped so a wide screen does not render giant pages) and
 * which keys turn the page.
 */

/** Pages never render wider than this; narrower containers (a 390 px phone) fit exactly. */
export const MAX_PAGE_WIDTH = 900;

/** The page after a step of `delta`, kept between 1 and the count (when known). */
export function stepPage(page: number, delta: number, pageCount: number | null): number {
  const last = pageCount ?? page;
  return Math.min(Math.max(page + delta, 1), Math.max(last, 1));
}

/** The page width for the space available; null until there is any (nothing renders yet). */
export function fitWidth(available: number): number | null {
  if (!Number.isFinite(available) || available < 1) return null;
  return Math.floor(Math.min(available, MAX_PAGE_WIDTH));
}

/** The parts of a keydown the arrow keys need. */
export interface KeyPress {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly defaultPrevented: boolean;
  /** The key went to a field, a menu or a dialog: it is theirs, not the viewer's. */
  readonly inOwnWidget: boolean;
}

const KEY_STEPS: ReadonlyMap<string, number> = new Map([
  ["ArrowLeft", -1],
  ["ArrowRight", 1],
]);

/** -1 or 1 for a bare left or right arrow aimed at the page; null for every other key. */
export function arrowStep(press: KeyPress): number | null {
  if (press.defaultPrevented || press.inOwnWidget) return null;
  if (press.altKey || press.ctrlKey || press.metaKey || press.shiftKey) return null;
  return KEY_STEPS.get(press.key) ?? null;
}

/** Fields, menus and dialogs keep their own arrow keys. */
const OWN_WIDGETS = 'input, textarea, select, [contenteditable="true"], [role="menu"], [role="dialog"], [role="alertdialog"], [role="slider"], [role="listbox"]';

export function isInOwnWidget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(OWN_WIDGETS) !== null;
}
