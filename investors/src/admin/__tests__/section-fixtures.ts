import { section } from "@/sections/__tests__/fixtures";
import type { SectionSlug } from "@/sections/sections-model";

import type { AdminSection } from "../sections-api";

const SORT_ORDER: Readonly<Record<SectionSlug, number>> = { overview: 1, team: 2, faq: 3, contact: 4 };

/** A section as GET /admin/sections answers it (KP5: invented text); published unless told otherwise. */
export function adminSection(slug: SectionSlug, overrides: Partial<AdminSection> = {}): AdminSection {
  return {
    ...section(slug),
    sortOrder: SORT_ORDER[slug],
    published: true,
    updatedBy: "user_admin",
    ...overrides,
  };
}

/** The four seeded sections in the server's order. */
export function adminSections(overrides: Partial<Record<SectionSlug, Partial<AdminSection>>> = {}): AdminSection[] {
  const slugs: readonly SectionSlug[] = ["overview", "team", "faq", "contact"];
  return slugs.map((slug) => adminSection(slug, overrides[slug]));
}
