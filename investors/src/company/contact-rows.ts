import { strings } from "@/strings";

import type { Founder } from "./company-data";
import { displayAddress } from "./link-address";

/*
 * The founder card's contact rows (PRD-003 §3.1, §3.2, US-303): the work
 * email, then any rows signed-in investors see (the founder_card section,
 * US-305/306), then LinkedIn once its address is set. Pure.
 */

/** One row: what it shows, where it goes, and the small label at its end. */
export interface ContactRow {
  /** The address, handle or number as the row shows it. */
  readonly text: string;
  /** An https:, mailto: or tel: address. */
  readonly href: string;
  /** "Work", "LinkedIn", or what the section gives ("Mobile", say). */
  readonly label: string;
}

/** What a row's icon shows, from its address. */
export type ContactRowKind = "email" | "phone" | "web";

/** The only schemes a row may link to: anything else is never a link on the card. */
const ROW_SCHEMES: ReadonlySet<string> = new Set(["https:", "mailto:", "tel:"]);

function schemeOf(href: string): string | null {
  try {
    return new URL(href).protocol;
  } catch {
    return null;
  }
}

/** True when the card may link to `href` (https:, mailto: or tel:). */
export function isContactAddress(href: string): boolean {
  const scheme = schemeOf(href);
  return scheme !== null && ROW_SCHEMES.has(scheme);
}

export function contactRowKind(href: string): ContactRowKind {
  const scheme = schemeOf(href);
  if (scheme === "mailto:") return "email";
  if (scheme === "tel:") return "phone";
  return "web";
}

/**
 * The card's rows, in order: the work email; then `extraRows` (the signed-in
 * rows, already parsed), less any whose address is not https, mailto or tel;
 * then LinkedIn when its address is set. A new list each time.
 */
export function founderRows(founder: Founder, extraRows: readonly ContactRow[] = []): readonly ContactRow[] {
  const email: ContactRow = {
    text: founder.email,
    href: `mailto:${founder.email}`,
    label: strings.company.rows.work,
  };
  const linkedin: readonly ContactRow[] =
    founder.linkedinUrl === null
      ? []
      : [{ text: displayAddress(founder.linkedinUrl), href: founder.linkedinUrl, label: strings.company.rows.linkedin }];
  return [email, ...extraRows.filter((row) => isContactAddress(row.href)), ...linkedin];
}
