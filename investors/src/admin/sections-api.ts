import { z } from "zod";

import { fetchJson } from "@/api/client";
import { sectionSchema } from "@/sections/sections-api";
import type { SectionSlug } from "@/sections/sections-model";

/**
 * The admin side of the sections (server/investors/routes/sections.js,
 * US-016): every section, published or not, and the save. The server checks
 * the admin allowlist on every call (KP3).
 */

export const adminSectionSchema = sectionSchema.extend({
  sortOrder: z.number().int(),
  published: z.boolean(),
  /** The Clerk id of the admin who saved it last; null while it is the seeded row. */
  updatedBy: z.string().nullable(),
});

export type AdminSection = z.infer<typeof adminSectionSchema>;

/** What PUT /admin/sections/:slug takes: all three fields, every time. */
export interface SectionBody {
  readonly title: string;
  readonly bodyMd: string;
  readonly published: boolean;
}

const listSchema = z.object({ sections: z.array(adminSectionSchema) });
const oneSchema = z.object({ section: adminSectionSchema });

const sectionPath = (slug: SectionSlug) => `/admin/sections/${encodeURIComponent(slug)}`;

export async function fetchAdminSections(signal?: AbortSignal): Promise<readonly AdminSection[]> {
  const answer = await fetchJson("/admin/sections", { schema: listSchema, signal });
  return answer.sections;
}

export async function saveSection(slug: SectionSlug, body: SectionBody): Promise<AdminSection> {
  const answer = await fetchJson(sectionPath(slug), { method: "PUT", body, schema: oneSchema });
  return answer.section;
}
