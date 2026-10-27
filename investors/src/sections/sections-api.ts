import { z } from "zod";

import { fetchJson } from "@/api/client";

/**
 * GET /api/investors/sections (server/investors/routes/sections.js, US-009):
 * the published sections, in the admins' order. A section nobody has
 * published is not in the list; a published one may still have an empty
 * body. The markdown is the admins' text as saved: Markdown.tsx renders it
 * without raw HTML.
 */

export const sectionSchema = z.object({
  slug: z.string().min(1),
  title: z.string(),
  bodyMd: z.string(),
  updatedAt: z.string(),
});

export type Section = z.infer<typeof sectionSchema>;

const listSchema = z.object({ sections: z.array(sectionSchema) });

export async function fetchSections(signal?: AbortSignal): Promise<readonly Section[]> {
  const answer = await fetchJson("/sections", { schema: listSchema, signal });
  return answer.sections;
}
