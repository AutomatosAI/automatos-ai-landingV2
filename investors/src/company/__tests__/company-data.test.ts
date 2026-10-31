import { describe, expect, it } from "vitest";

import { strings } from "@/strings";

import { bookingHref, FOUNDER, PRODUCT_LINKS, TEAM, type ProductLink } from "../company-data";
import companyDataSource from "../company-data.ts?raw";
import { isStatusLabel, STATUS_LABELS } from "../status";

/*
 * The public facts against the register (PRD-003 §5.1, §5.2, §5.3). A change
 * to a chip, a name or a line is a one-line PR, and it lands here first.
 */

const SPINE =
  "One assistant, Auto, runs a team of AI agents that finish a small business's work in its own brand. Open source, on your own server. Hosted beta opens November 2026.";

const ALL_LINKS: readonly ProductLink[] = [...PRODUCT_LINKS.seeItWorking, ...PRODUCT_LINKS.alsoFromAutomatos];

function linkNamed(name: string): ProductLink {
  const link = ALL_LINKS.find((candidate) => candidate.name === name);
  if (!link) throw new Error(`No product link named ${name}`);
  return link;
}

/** Every string inside a value, however deep (functions are not text on the page). */
function textsIn(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(textsIn);
  if (value !== null && typeof value === "object") return Object.values(value).flatMap(textsIn);
  return [];
}

/** What the signed-out page and Home can show from code: all of it public. */
const PUBLIC_TEXT = { FOUNDER, TEAM, PRODUCT_LINKS, company: strings.company, teaser: strings.teaser };

/** A phone number however it is written (PRD-003 US-302). */
const PHONE_LIKE = /\+?\d[\d ()-]{7,}\d/;

/** Invented numbers from ranges kept for fiction (UK drama numbers, US 555-01xx). */
const INVENTED_PHONES = ["+44 7700 900123", "(020) 7946 0000", "+1 202-555-0123"] as const;

interface NeverSaid {
  readonly pattern: RegExp;
  /** A line the pattern must catch, so a broken pattern cannot pass by matching nothing. */
  readonly example: string;
}

/**
 * Words never on the page (MESSAGE-SHEET §6, DECK-PLAN §1.3; PRD-003 §5.3 and
 * §9), matched without regard to case. "read-only" (the Markets line) is a
 * description, not a claim, so it is not the banned "only".
 */
const NEVER: readonly NeverSaid[] = [
  { pattern: /the open alternative/i, example: "The open alternative to everything" },
  { pattern: /\b\d+[\s-]*(?:minutes?|mins?|hours?|hrs?)\b/i, example: "Book a 20-minute call" },
  { pattern: /\bnobody else\b/i, example: "Nobody else does this" },
  { pattern: /(?<!read-)\bonly\b/i, example: "The only platform" },
  { pattern: /\bfirst\b/i, example: "The first of its kind" },
  { pattern: /\bhosted\b[^.]*\blive\b/i, example: "Hosted Studio is live" },
  { pattern: /\bhosted beta is open\b/i, example: "The hosted beta is open" },
  { pattern: /the team built it/i, example: "The team built it" },
  { pattern: /\bexclusive\b/i, example: "An exclusive look" },
  { pattern: /\bthe marketplace\b/i, example: "Visit the marketplace" },
];

describe("the status chips", () => {
  it("are the register's four labels, exactly", () => {
    expect(STATUS_LABELS).toEqual(["LIVE", "IN BETA", "BUILDING NOW", "NEXT, WITH THIS FUNDING"]);
    expect(isStatusLabel("LIVE")).toBe(true);
    expect(isStatusLabel("Live")).toBe(false);
    expect(isStatusLabel("BETA")).toBe(false);
    expect(isStatusLabel(null)).toBe(false);
  });

  it("are one of the four labels on every link, or none", () => {
    for (const link of ALL_LINKS) {
      expect(link.chip === null || isStatusLabel(link.chip), `${link.name}: ${String(link.chip)}`).toBe(true);
    }
  });

  it("put Studio at BUILDING NOW with the pre-flip line, and nothing about Studio reads live", () => {
    const studio = linkNamed("Studio");
    expect(studio.chip).toBe("BUILDING NOW");
    expect(studio.line).toBe("Hosted beta opens November 2026 · join the waitlist");
    for (const text of textsIn(studio)) expect(text).not.toMatch(/live/i);
  });

  it("put Automatos Go in beta, by invite", () => {
    const go = linkNamed("Automatos Go");
    expect(go.chip).toBe("IN BETA");
    expect(go.line).toBe("The iPhone app · TestFlight beta, by invite");
  });

  it("put GitHub and Academy at LIVE, and give Markets none", () => {
    expect(linkNamed("GitHub").chip).toBe("LIVE");
    expect(linkNamed("Academy").chip).toBe("LIVE");
    expect(linkNamed("Markets").chip).toBeNull();
  });
});

describe("the product links", () => {
  it("are §5.2's cards, in §5.2's order", () => {
    expect(PRODUCT_LINKS.seeItWorking).toEqual([
      {
        name: "Studio",
        href: "https://studio.automatos.app",
        chip: "BUILDING NOW",
        line: "Hosted beta opens November 2026 · join the waitlist",
        icon: "os",
      },
      {
        name: "Automatos Go",
        href: "https://github.com/AutomatosAI/automatos-go",
        chip: "IN BETA",
        line: "The iPhone app · TestFlight beta, by invite",
        icon: "go",
      },
      {
        name: "GitHub",
        href: "https://github.com/AutomatosAI/automatos-ai",
        chip: "LIVE",
        line: "Open source, Apache-2.0",
        icon: "github",
      },
    ]);
    expect(PRODUCT_LINKS.alsoFromAutomatos).toEqual([
      {
        name: "Academy",
        href: "https://academy.automatos.app",
        chip: "LIVE",
        line: "Free certification prep, with an AI tutor",
        icon: "academy",
      },
      {
        name: "Markets",
        href: "https://markets.automatos.app",
        chip: null,
        line: "Read-only crypto research, free",
        icon: "markets",
      },
    ]);
  });

  it("give each product its family mark from the kit: the navigator, the wheel, the chart room, the weather; GitHub its own", () => {
    expect(ALL_LINKS.map((link) => [link.name, link.icon])).toEqual([
      ["Studio", "os"],
      ["Automatos Go", "go"],
      ["GitHub", "github"],
      ["Academy", "academy"],
      ["Markets", "markets"],
    ]);
  });

  it("cannot be changed at run time", () => {
    expect(Object.isFrozen(PRODUCT_LINKS)).toBe(true);
    for (const list of [PRODUCT_LINKS.seeItWorking, PRODUCT_LINKS.alsoFromAutomatos]) {
      expect(Object.isFrozen(list)).toBe(true);
      for (const link of list) expect(Object.isFrozen(link)).toBe(true);
    }
  });
});

describe("the founder and the team", () => {
  it("name the founder, with his line word for word", () => {
    expect(FOUNDER.name).toBe("Gerard Kavanagh");
    expect(FOUNDER.role).toBe("Founder");
    expect(FOUNDER.line).toBe("I built Automatos myself, with AI agents. Then I brought in the team to scale it.");
    expect(FOUNDER.email).toBe("gerard@automatos.app");
    expect(strings.company.founderPhotoAlt).toBe(FOUNDER.name);
  });

  it("leave LinkedIn and the booking page unset, so their rows and buttons stay hidden", () => {
    // D8. When an address is given, this changes with it; check first that the
    // booking page shows no phone number to the public (PRD-003 §12, Q5).
    expect(FOUNDER.linkedinUrl).toBeNull();
    expect(FOUNDER.bookingUrl).toBeNull();
  });

  it("is slide 11's public team row, character for character, in its order", () => {
    expect(TEAM).toEqual([
      { name: "Gerard Kavanagh", role: "Founder" },
      { name: "Dave", role: "CTO (since Oct 2026)" },
      { name: "Ricardo 'Rikki' Capone", role: "fundraising" },
    ]);
  });

  it("cannot be changed at run time", () => {
    expect(Object.isFrozen(FOUNDER)).toBe(true);
    expect(Object.isFrozen(TEAM)).toBe(true);
    for (const member of TEAM) expect(Object.isFrozen(member)).toBe(true);
  });
});

describe("the addresses", () => {
  it("are all https, and the email is a mailto address", () => {
    const addresses = [...ALL_LINKS.map((link) => link.href), FOUNDER.linkedinUrl, FOUNDER.bookingUrl].filter(
      (address): address is string => address !== null,
    );
    for (const address of addresses) expect(new URL(address).protocol, address).toBe("https:");
    expect(FOUNDER.email).toMatch(/^[^\s@:/]+@[^\s@:/]+\.[a-z]+$/);
    expect(new URL(`mailto:${FOUNDER.email}`).protocol).toBe("mailto:");
  });
});

describe("bookingHref", () => {
  it("adds the portal's ref tag to a set address", () => {
    expect(bookingHref("https://card.example/someone")).toBe("https://card.example/someone?ref=portal");
  });

  it("keeps an existing query and fragment", () => {
    expect(bookingHref("https://card.example/someone?lang=en#book")).toBe(
      "https://card.example/someone?lang=en&ref=portal#book",
    );
  });

  it("replaces another ref tag rather than adding a second", () => {
    expect(bookingHref("https://card.example/someone?ref=stand")).toBe("https://card.example/someone?ref=portal");
  });
});

describe("the page's words", () => {
  it("lead with the company and the spine sentence, pre-flip", () => {
    expect(strings.company.name).toBe("Automatos");
    expect(strings.company.name).toBe(strings.shell.wordmark);
    expect(strings.teaser.pitch).toBe(SPINE);
    expect(strings.company.spine).toBe(SPINE);
  });

  it("give one primary action and the new heading, without the old line under Access", () => {
    expect(strings.auth.createAccount).toBe("Create an account to read the deck");
    expect(strings.auth.signIn).toBe("Sign in");
    expect(strings.teaser.insideHeading).toBe("Inside the portal");
    expect(strings.teaser.signInHeading).toBe("Access");
    expect(strings.teaser).not.toHaveProperty("signInBody");
    expect(strings.company.signInToOpen).toBe("Sign in to open");
  });

  it("name the groups, the rows and the quick-access tiles as §5.1 does", () => {
    const { company } = strings;
    expect([company.team, company.seeItWorking, company.alsoFromAutomatos, company.quickAccess.heading]).toEqual([
      "Team",
      "See it working",
      "Also from Automatos",
      "Quick access",
    ]);
    expect(company.rows).toEqual({ work: "Work", linkedin: "LinkedIn" });
    expect(company.bookCall).toBe("Book a call");
    const { deck, demo, documents, team, faq, bookCall } = company.quickAccess;
    expect([deck, demo, documents, team, faq].map(({ label, hint }) => [label, hint])).toEqual([
      ["View the deck", "Slideshow"],
      ["Play the demo", "Video"],
      ["Documents", "Library"],
      ["Team", "Page"],
      ["FAQ", "Page"],
    ]);
    expect(deck.label).toBe(strings.home.pitch.viewDeck);
    expect(bookCall).toEqual({ label: "Book a call", hint: "Tappal ↗", contactHint: "Contact page" });
  });
});

describe("what the code makes public", () => {
  it("holds no phone number and no phone link", () => {
    const serialised = JSON.stringify(PUBLIC_TEXT);
    expect(serialised).not.toMatch(PHONE_LIKE);
    expect(serialised).not.toMatch(/tel:/i);
    for (const text of textsIn(PUBLIC_TEXT)) expect(text).not.toMatch(PHONE_LIKE);
  });

  it("holds no phone number anywhere in company-data.ts, comments included (a public repo)", () => {
    expect(companyDataSource).toContain("export const FOUNDER");
    expect(companyDataSource).not.toMatch(PHONE_LIKE);
    expect(companyDataSource).not.toMatch(/tel:/i);
  });

  it.each(NEVER)("never says $pattern", ({ pattern }) => {
    for (const text of textsIn(PUBLIC_TEXT)) expect(text, text).not.toMatch(pattern);
  });

  it("would catch what it looks for", () => {
    for (const { pattern, example } of NEVER) expect(example).toMatch(pattern);
    expect("Read-only crypto research, free").not.toMatch(/(?<!read-)\bonly\b/i);
    for (const phone of INVENTED_PHONES) expect(phone).toMatch(PHONE_LIKE);
  });
});
