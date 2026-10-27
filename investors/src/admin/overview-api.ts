import { z } from "zod";

import { fetchJson } from "@/api/client";

/**
 * The admin overview API (server/investors/routes/admin-overview.js,
 * US-011). The answer is parsed (KP15); the server checks the admin
 * allowlist (KP3).
 */

/** The event types investors.events allows (001_init.sql). */
export const EVENT_TYPES = [
  "signed_in",
  "profile_completed",
  "section_view",
  "document_open",
  "document_download",
  "page_view",
  "video_progress",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

const count = z.number().int().nonnegative();

/** One UTC calendar day of the 30-day series. */
export const seriesDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  signups: count,
  activeInvestors: count,
});

export type SeriesDay = z.infer<typeof seriesDaySchema>;

/** An event with its investor; documentTitle is null without a document or once it is deleted. */
export const latestEventSchema = z.object({
  id: z.number().int(),
  type: z.enum(EVENT_TYPES),
  documentId: z.string().nullable(),
  documentTitle: z.string().nullable(),
  page: z.number().int().nullable(),
  durationMs: z.number().int().nullable(),
  data: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
  investorId: z.string().min(1),
  investorName: z.string().nullable(),
  investorFirm: z.string().nullable(),
  investorEmail: z.string(),
});

export type LatestEvent = z.infer<typeof latestEventSchema>;

export const overviewSchema = z.object({
  investorsTotal: count,
  investorsNew7d: count,
  activeInvestors7d: count,
  deckOpens7d: count,
  downloads7d: count,
  series: z.array(seriesDaySchema),
  latestEvents: z.array(latestEventSchema),
});

export type Overview = z.infer<typeof overviewSchema>;

export function fetchOverview(signal?: AbortSignal): Promise<Overview> {
  return fetchJson("/admin/overview", { schema: overviewSchema, signal });
}
