import type { StatusLabel } from "./status";

/*
 * The public facts on the portal's company and founder cards (PRD-003 §5.1,
 * §5.2; D4): the founder, the team and the product links with their chips.
 * The signed-out page cannot read any section, so these live in code.
 *
 * Everything here ships in the public app bundle and sits in a public repo,
 * so it holds public facts and nothing else. A phone number never goes here
 * or in strings.ts: rows for signed-in investors belong in the founder_card
 * section, behind sign-in (D5). company/__tests__/company-data.test.ts checks
 * this file against the status register and the words never used.
 */

export interface Founder {
  readonly name: string;
  readonly role: string;
  /** Who built it, in the founder's words (DECK-PLAN §2.1). On the signed-out card. */
  readonly line: string;
  /** The work email, labelled "Work". */
  readonly email: string;
  /** null until the address is known: the LinkedIn row is hidden. */
  readonly linkedinUrl: string | null;
  /**
   * The booking page, null until the address is known: every Book a call that
   * would open it is hidden (on Home the tile goes to the Contact page instead).
   * Open it through bookingHref, never as it stands.
   */
  readonly bookingUrl: string | null;
}

/** One person on the team row: names and roles as the deck's public upload gives them. */
export interface TeamMember {
  readonly name: string;
  readonly role: string;
}

/** A product card's icon; the product cards map each key to its glyph. */
export type ProductIconKey = "compass" | "smartphone" | "github" | "graduation-cap" | "chart-candlestick";

export interface ProductLink {
  readonly name: string;
  /** An https address on the product's own site or repository. */
  readonly href: string;
  /** The register's label, or null where neither the register nor appendix A12 gives one. */
  readonly chip: StatusLabel | null;
  /** The line under the name. */
  readonly line: string;
  readonly icon: ProductIconKey;
}

/** The two groups of product cards, in the order the page shows them. */
export interface ProductLinks {
  readonly seeItWorking: readonly ProductLink[];
  readonly alsoFromAutomatos: readonly ProductLink[];
}

/** The tag a booking made from the portal carries (STAND-ATTRACT-COPY, "The ref tag"). */
const BOOKING_REF_PARAM = "ref";
const BOOKING_REF_VALUE = "portal";

/** A frozen copy of a list of flat records: neither the list nor an entry can change. */
function frozenList<T extends object>(items: readonly T[]) {
  return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}

export const FOUNDER: Founder = Object.freeze({
  name: "Gerard Kavanagh",
  role: "Founder",
  line: "I built Automatos myself, with AI agents. Then I brought in the team to scale it.",
  email: "gerard@automatos.app",
  linkedinUrl: null,
  bookingUrl: null,
});

/** DECK-PLAN slide 11's public upload, character for character, in its order. */
export const TEAM: readonly TeamMember[] = frozenList<TeamMember>([
  { name: "Gerard Kavanagh", role: "Founder" },
  { name: "Dave", role: "CTO (since Oct 2026)" },
  { name: "Ricardo 'Rikki' Capone", role: "fundraising" },
]);

/**
 * The product cards (PRD-003 §5.2). Chips from DECK-PLAN §3.0's default
 * column or appendix A12 alone. At the hosted flip, and only once it is
 * confirmed, Studio's chip and line change here and the spine in strings.ts.
 */
export const PRODUCT_LINKS: ProductLinks = Object.freeze({
  seeItWorking: frozenList<ProductLink>([
    {
      name: "Studio",
      href: "https://studio.automatos.app",
      chip: "BUILDING NOW",
      line: "Hosted beta opens November 2026 · join the waitlist",
      icon: "compass",
    },
    {
      name: "Automatos Go",
      href: "https://github.com/AutomatosAI/automatos-go",
      chip: "IN BETA",
      line: "The iPhone app · TestFlight beta, by invite",
      icon: "smartphone",
    },
    {
      name: "GitHub",
      href: "https://github.com/AutomatosAI/automatos-ai",
      chip: "LIVE",
      line: "Open source, Apache-2.0",
      icon: "github",
    },
  ]),
  alsoFromAutomatos: frozenList<ProductLink>([
    {
      name: "Academy",
      href: "https://academy.automatos.app",
      chip: "LIVE",
      line: "Free certification prep, with an AI tutor",
      icon: "graduation-cap",
    },
    {
      name: "Markets",
      href: "https://markets.automatos.app",
      chip: null,
      line: "Read-only crypto research, free",
      icon: "chart-candlestick",
    },
  ]),
});

/**
 * The booking page's address with the portal's ref tag, keeping any query and
 * fragment it already has. Pure: it returns a new string. The address is set
 * in code and the unit test keeps it https, so it always parses.
 */
export function bookingHref(url: string): string {
  const address = new URL(url);
  address.searchParams.set(BOOKING_REF_PARAM, BOOKING_REF_VALUE);
  return address.toString();
}
