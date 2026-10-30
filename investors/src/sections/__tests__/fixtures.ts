import type { Section } from "../sections-api";
import type { SectionSlug } from "../sections-model";

const TITLES: Readonly<Record<SectionSlug, string>> = {
  overview: "Overview",
  team: "Team",
  faq: "FAQ",
  contact: "Contact",
  founder_card: "Founder card",
};

/** A published section as GET /sections answers it (KP5: invented text). */
export function section(slug: SectionSlug, overrides: Partial<Section> = {}): Section {
  return {
    slug,
    title: TITLES[slug],
    bodyMd: `Example ${slug} text.`,
    updatedAt: "2026-10-27T09:00:00.000Z",
    ...overrides,
  };
}
