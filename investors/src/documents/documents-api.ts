import { z } from "zod";

import { fetchJson } from "@/api/client";
import { linkUrl } from "@/api/link-url";

import { DOCUMENT_KINDS } from "./kinds";

/**
 * The investor documents API (server/investors/routes/documents.js, US-006).
 * The list holds only published documents with a file, in the admin's order.
 * A link is a presigned GET (5 minutes); the server records the open or the
 * download when it issues one (KP16), so the client sends no event for it.
 */

export const investorDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  kind: z.enum(DOCUMENT_KINDS),
  fileName: z.string().nullable(),
  contentType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  pageCount: z.number().int().nullable(),
  version: z.number().int(),
  updatedAt: z.string(),
});

export type InvestorDocument = z.infer<typeof investorDocumentSchema>;

/** inline: read in the browser (document_open); download: saved with its name (document_download). */
export type LinkMode = "inline" | "download";

const listSchema = z.object({ documents: z.array(investorDocumentSchema) });
const linkSchema = z.object({ url: linkUrl, expiresIn: z.number().int().positive() });

export type DocumentLink = z.infer<typeof linkSchema>;

export async function fetchDocuments(signal?: AbortSignal): Promise<readonly InvestorDocument[]> {
  const answer = await fetchJson("/documents", { schema: listSchema, signal });
  return answer.documents;
}

export function requestDocumentLink(id: string, mode: LinkMode, signal?: AbortSignal): Promise<DocumentLink> {
  const path = `/documents/${encodeURIComponent(id)}/link`;
  return fetchJson(path, { method: "POST", body: { mode }, schema: linkSchema, signal });
}
