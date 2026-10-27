import { ADMIN_PATH } from "@/lib/paths";
import type { SectionSlug } from "@/sections/sections-model";

/** The section editor's pages (US-016), relative to the app's basename like lib/paths.ts. */
export const ADMIN_SECTIONS_PATH = `${ADMIN_PATH}/sections`;

export function adminSectionPath(slug: SectionSlug): string {
  return `${ADMIN_SECTIONS_PATH}/${encodeURIComponent(slug)}`;
}

const SLUGS: readonly string[] = ["overview", "team", "faq", "contact"] satisfies readonly SectionSlug[];

const isSectionSlug = (value: string): value is SectionSlug => SLUGS.includes(value);

/** A slug from the address: one of the four seeded sections, else null. */
export function sectionSlugOf(value: string | undefined): SectionSlug | null {
  return value !== undefined && isSectionSlug(value) ? value : null;
}
