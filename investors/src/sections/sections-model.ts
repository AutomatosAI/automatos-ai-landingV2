import type { Section } from "./sections-api";

/**
 * The sections the seed migrations create (002_sections_seed.sql, then
 * 005_founder_card_section.sql); admins edit them, nobody adds or removes one.
 */
export type SectionSlug = "overview" | "team" | "faq" | "contact" | "founder_card";

/**
 * The founder card's signed-in-only rows (PRD-003 D5, US-305): one contact
 * row per line, read by company/card-rows.ts, never a page or a nav link.
 */
export const FOUNDER_CARD_SECTION = "founder_card" as const satisfies SectionSlug;

/**
 * The sections with a page of their own, in the sidebar's order. The overview
 * sits on the home page, and the founder card's rows in Home's founder card.
 */
export const PAGE_SECTIONS = ["team", "faq", "contact"] as const satisfies readonly SectionSlug[];

export type PageSection = (typeof PAGE_SECTIONS)[number];

/** The section when it is published (the list holds no other), else null. */
export function findSection(sections: readonly Section[], slug: SectionSlug): Section | null {
  return sections.find((section) => section.slug === slug) ?? null;
}

/** The section when there is something to read: published, with a body that is not blank. */
export function readableSection(sections: readonly Section[], slug: SectionSlug): Section | null {
  const section = findSection(sections, slug);
  return section !== null && section.bodyMd.trim() !== "" ? section : null;
}

/**
 * The section pages the sidebar links: the published ones, in PAGE_SECTIONS
 * order. A published page with no text yet still gets its link; the page
 * says it is coming soon.
 */
export function publishedPages(sections: readonly Section[]): readonly PageSection[] {
  return PAGE_SECTIONS.filter((slug) => findSection(sections, slug) !== null);
}
