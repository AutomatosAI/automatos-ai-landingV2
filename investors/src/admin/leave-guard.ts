/**
 * Which clicks would take the admin off the editor (and so drop a draft).
 * The app runs under <BrowserRouter>, which has no navigation blocker
 * (react-router's useBlocker needs a data router), so use-leave-guard.ts
 * catches link clicks before the router sees them; this is its pure rule.
 */

export interface ClickFacts {
  readonly button: number;
  /** Ctrl, Meta, Shift or Alt held: the browser opens the link elsewhere. */
  readonly modified: boolean;
  readonly defaultPrevented: boolean;
}

export interface AnchorFacts {
  /** The link's address as written (relative or absolute). */
  readonly href: string;
  readonly target: string;
  readonly download: boolean;
}

/** Targets that load the link in this tab. */
const SAME_TAB_TARGETS: readonly string[] = ["", "_self", "_top", "_parent"];

function parse(href: string, base: string): URL | null {
  try {
    return new URL(href, base);
  } catch {
    return null;
  }
}

/**
 * Whether following the click replaces the page at `current` (an absolute
 * URL): a plain left click on an http(s) link, in this tab, to another path
 * or query. A new tab, a download, a mailto: link or a jump within the page
 * leaves the editor where it is.
 */
export function leavesPage(click: ClickFacts, anchor: AnchorFacts, current: string): boolean {
  if (click.defaultPrevented || click.button !== 0 || click.modified) return false;
  if (anchor.download || !SAME_TAB_TARGETS.includes(anchor.target)) return false;
  const here = parse(current, current);
  const next = parse(anchor.href, current);
  if (here === null || next === null) return false;
  if (next.protocol !== "http:" && next.protocol !== "https:") return false;
  return next.origin !== here.origin || next.pathname !== here.pathname || next.search !== here.search;
}

export function clickFactsOf(event: MouseEvent): ClickFacts {
  return {
    button: event.button,
    modified: event.ctrlKey || event.metaKey || event.shiftKey || event.altKey,
    defaultPrevented: event.defaultPrevented,
  };
}

export function anchorFactsOf(anchor: HTMLAnchorElement): AnchorFacts {
  return {
    href: anchor.getAttribute("href") ?? "",
    target: anchor.target,
    download: anchor.hasAttribute("download"),
  };
}

/** The link a click landed in, if any (the click may be on an icon inside it). */
export function anchorOf(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a");
  return anchor !== null && anchor.hasAttribute("href") ? anchor : null;
}
