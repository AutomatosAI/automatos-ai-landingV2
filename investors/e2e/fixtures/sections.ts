import type { AdminSection } from "../../src/admin/sections-api";
import type { ContactRow } from "../../src/company/contact-rows";
import { section } from "../../src/sections/__tests__/fixtures";
import type { Section } from "../../src/sections/sections-api";

/*
 * The five sections as the mocked API answers them (KP5: every word and
 * number is invented for these checks). The overview carries raw HTML that
 * would run if the renderer ever let HTML through: the specs check that it
 * never does. The founder card holds a phone row and one more link, and is
 * published here, so the teaser's checks prove that no number and no tel:
 * link reaches the signed-out page whatever the section holds (PRD-003 D5).
 */

/** The global the hostile HTML would set: undefined while the renderer drops it. */
export const MARKDOWN_MARKER = "__investorsE2eMarkdownRan";

/** A <script> and an <img onerror>, each an HTML block of its own in the markdown. */
export const HOSTILE_HTML = [
  `<script>window.${MARKDOWN_MARKER} = "script";</script>`,
  `<img src="/e2e-storage/missing.png" onerror="window.${MARKDOWN_MARKER} = 'img'">`,
].join("\n\n");

/** A line of the overview, to know its markdown has rendered. */
export const OVERVIEW_POINT = "An invented point about the product.";

/** The contact section's booking link: another origin, so it opens in a new tab. */
export const BOOKING = { label: "Book a call", href: "https://calendar.example.com/e2e" } as const;

/** The home page's overview, with the hostile HTML between its paragraph and its list. */
export const OVERVIEW_SECTION: Section = section("overview", {
  bodyMd: [
    "Example Co. is an invented company. Every word on these pages is made up for the browser checks.",
    HOSTILE_HTML,
    `- ${OVERVIEW_POINT}\n- An invented point about the market.`,
  ].join("\n\n"),
});

const TEAM = section("team", {
  bodyMd: [
    "## Alex Example\n\nChief executive. An invented biography of two sentences. It says nothing true.",
    "## Sam Placeholder\n\nChief technology officer. An invented biography, as short as the first.",
  ].join("\n\n"),
});

const FAQ = section("faq", {
  bodyMd: [
    "## Is this a real question?\n\nNo. It stands in for a question an investor might ask.",
    "## Where do the answers come from?\n\nThe admins write them in the section editor, in markdown.",
  ].join("\n\n"),
});

const CONTACT = section("contact", {
  bodyMd: `The team answers within two working days. [${BOOKING.label}](${BOOKING.href}) to talk it through.`,
});

/** The founder card's phone row, as the card shows it: an invented number from the UK's drama range. */
export const FOUNDER_CARD_PHONE: ContactRow = { text: "+44 7700 900987", href: "tel:+447700900987", label: "Mobile" };

/** The founder card's other row: an invented page on another origin, so it opens in a new tab. */
export const FOUNDER_CARD_LINK: ContactRow = {
  text: "example.com/e2e-founder",
  href: "https://example.com/e2e-founder",
  label: "Site",
};

/** The founder_card section (PRD-003 US-305): one row per line, "- [text](address) label". */
export const FOUNDER_CARD: Section = section("founder_card", {
  bodyMd: [FOUNDER_CARD_PHONE, FOUNDER_CARD_LINK].map((row) => `- [${row.text}](${row.href}) ${row.label}`).join("\n"),
});

/** GET /sections: all five published, in the admins' order. */
export const SECTIONS: readonly Section[] = [OVERVIEW_SECTION, TEAM, FAQ, CONTACT, FOUNDER_CARD];

/** GET /admin/sections: the same five, as the editor sees them. */
export const ADMIN_SECTIONS: readonly AdminSection[] = SECTIONS.map((each, sortOrder) => ({
  ...each,
  sortOrder,
  published: true,
  updatedBy: "user_e2e_admin",
}));
