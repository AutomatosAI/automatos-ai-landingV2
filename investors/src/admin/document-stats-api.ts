import { z } from "zod";

import { fetchJson } from "@/api/client";

import { adminDocumentSchema } from "./documents-api";

/**
 * One document's analytics (GET /admin/documents/:id/stats, US-015), for one
 * version of its file. The answer is parsed (KP15); the server checks the
 * admin allowlist (KP3) and works every number out in SQL
 * (server/investors/queries/document-stats.js).
 */

const count = z.number().int().nonnegative();
const version = z.number().int().positive();

/** One page of the document, 1..pageCount, zero-filled. */
export const pageStatsSchema = z.object({
  page: z.number().int().positive(),
  avgDwellMs: count,
  readersReached: count,
  /** 0..100, one decimal. */
  pctReached: z.number().min(0).max(100),
});

export type PageStats = z.infer<typeof pageStatsSchema>;

/** An investor with any event of this version; furthestPage 0 when no page was recorded. */
export const readerSchema = z.object({
  investorId: z.string().min(1),
  name: z.string().nullable(),
  firm: z.string().nullable(),
  furthestPage: count,
  timeMs: count,
  downloaded: z.boolean(),
  /** null: the reader never opened this version (a download only). */
  lastOpenAt: z.string().nullable(),
});

export type Reader = z.infer<typeof readerSchema>;

export const documentStatsSchema = z.object({
  document: adminDocumentSchema,
  /** The version answered: the one asked for, else the current one. */
  version,
  /** Versions with events, newest first; the current one is missing until someone reads it. */
  versions: z.array(version),
  uniqueReaders: count,
  opens: count,
  downloads: count,
  avgTimeMs: count,
  /** Empty when the document has no page count (not a PDF). */
  pages: z.array(pageStatsSchema),
  /** Newest open first; readers who never opened come last. */
  readers: z.array(readerSchema),
});

export type DocumentStats = z.infer<typeof documentStatsSchema>;

/** version null: the document's current version (the server's default). */
export function fetchDocumentStats(id: string, version: number | null, signal?: AbortSignal): Promise<DocumentStats> {
  const query = version === null ? "" : `?${new URLSearchParams({ version: String(version) }).toString()}`;
  return fetchJson(`/admin/documents/${encodeURIComponent(id)}/stats${query}`, { schema: documentStatsSchema, signal });
}
