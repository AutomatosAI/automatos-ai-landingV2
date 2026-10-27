/**
 * Addresses in the admins' markdown. Every link carries
 * rel="noopener noreferrer"; one that leaves the site (an http(s) address on
 * another origin, such as a booking page) opens in a new tab. mailto: and
 * the site's own pages open in place. Images show only from the site itself:
 * an image elsewhere would tell that host who read the page and when.
 * react-markdown has already emptied any address whose scheme is not safe
 * (javascript:, data:, ...): such a link renders as plain text.
 */

export const LINK_REL = "noopener noreferrer";

const WEB_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

function resolve(address: string | undefined, origin: string): URL | null {
  if (!address) return null;
  try {
    return new URL(address, origin);
  } catch {
    return null;
  }
}

/** True for an http(s) address on another origin than `origin` (the page's own). */
export function isExternalHref(href: string | undefined, origin: string): boolean {
  const url = resolve(href, origin);
  return url !== null && WEB_PROTOCOLS.has(url.protocol) && url.origin !== origin;
}

/** True for an address on the page's own origin (relative, or absolute on `origin`). */
export function isSiteAddress(address: string | undefined, origin: string): boolean {
  const url = resolve(address, origin);
  return url !== null && url.origin === origin;
}

/** The attributes a markdown link gets on top of its href. */
export function linkAttributes(href: string | undefined, origin: string): { readonly rel: string; readonly target?: "_blank" } {
  return isExternalHref(href, origin) ? { rel: LINK_REL, target: "_blank" } : { rel: LINK_REL };
}
