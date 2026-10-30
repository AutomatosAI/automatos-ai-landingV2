/*
 * How a card shows an address (PRD-003 §5.2): without its scheme, and broken
 * only after a "/" (the product cards put a <wbr> after each slash). Pure.
 */

const SCHEME = /^https?:\/\//i;
const TRAILING_SLASH = /\/+$/;

/** The address as a card shows it: "github.com/AutomatosAI/automatos-ai", no scheme, no trailing "/". */
export function displayAddress(href: string): string {
  return href.replace(SCHEME, "").replace(TRAILING_SLASH, "");
}

export interface AddressSegments {
  /** Every segment but the last, each with its "/": a line may break after any of them. */
  readonly head: readonly string[];
  /** The last segment, kept on one line with the card's external-link arrow. */
  readonly last: string;
}

/** "github.com/AutomatosAI/automatos-go" → head ["github.com/", "AutomatosAI/"], last "automatos-go". */
export function addressSegments(address: string): AddressSegments {
  const parts = address.split("/");
  return {
    head: parts.slice(0, -1).map((part) => `${part}/`),
    last: parts[parts.length - 1] ?? "",
  };
}
