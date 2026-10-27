import { z } from "zod";

import { fetchJson } from "@/api/client";
import { DOCUMENT_KINDS } from "@/documents/kinds";
import { CHEQUE_SIZES, INVESTOR_TYPES, SOURCES } from "@/profile/options";

import { EVENT_TYPES } from "./overview-api";

/**
 * The admin investors API (server/investors/routes/admin-investors.js,
 * US-012 and US-013). Every answer is parsed (KP15); the server checks the
 * admin allowlist on every call (KP3).
 */

const count = z.number().int().nonnegative();

/** The alert-on-first-open document this investor opened most: furthest page (0: none recorded) of its page count. */
export const deckProgressSchema = z.object({
  documentId: z.string().min(1),
  maxPage: count,
  pageCount: count.nullable(),
});

export type DeckProgress = z.infer<typeof deckProgressSchema>;

/** One row of GET /admin/investors. */
export const investorRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
  email: z.string(),
  firm: z.string().nullable(),
  investorType: z.enum(INVESTOR_TYPES).nullable(),
  chequeSize: z.enum(CHEQUE_SIZES).nullable(),
  source: z.enum(SOURCES).nullable(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  sessions: count,
  totalMs: count,
  docsOpened: count,
  downloads: count,
  deckProgress: deckProgressSchema.nullable(),
  blocked: z.boolean(),
});

export type InvestorRow = z.infer<typeof investorRowSchema>;

const pageFields = { total: count, page: z.number().int().positive(), pageSize: z.number().int().positive() };

export const investorListSchema = z.object({ investors: z.array(investorRowSchema), ...pageFields });

export type InvestorList = z.infer<typeof investorListSchema>;

/** One investor's whole row, as the detail, PATCH and export answer it. */
export const adminInvestorSchema = z.object({
  id: z.string().min(1),
  clerkUserId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  firm: z.string().nullable(),
  title: z.string().nullable(),
  investorType: z.enum(INVESTOR_TYPES).nullable(),
  linkedinUrl: z.string().nullable(),
  chequeSize: z.enum(CHEQUE_SIZES).nullable(),
  country: z.string().nullable(),
  source: z.enum(SOURCES).nullable(),
  marketingOptIn: z.boolean(),
  marketingOptInAt: z.string().nullable(),
  profileCompletedAt: z.string().nullable(),
  blocked: z.boolean(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
});

export type AdminInvestor = z.infer<typeof adminInvestorSchema>;

/** What one investor did with one document, over every version. */
export const documentSummarySchema = z.object({
  documentId: z.string().min(1),
  title: z.string(),
  kind: z.enum(DOCUMENT_KINDS),
  pageCount: count.nullable(),
  opens: count,
  furthestPage: count,
  timeMs: count,
  downloaded: z.boolean(),
});

export type DocumentSummary = z.infer<typeof documentSummarySchema>;

export const investorDetailSchema = z.object({
  investor: adminInvestorSchema,
  documents: z.array(documentSummarySchema),
});

export type InvestorDetail = z.infer<typeof investorDetailSchema>;

/** A timeline event; documentTitle is null without a document or once it is deleted. */
export const timelineEventSchema = z.object({
  id: z.number().int(),
  type: z.enum(EVENT_TYPES),
  sessionId: z.string().nullable(),
  documentId: z.string().nullable(),
  documentTitle: z.string().nullable(),
  documentVersion: z.number().int().nullable(),
  page: z.number().int().nullable(),
  durationMs: z.number().int().nullable(),
  data: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});

export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const timelineSchema = z.object({ events: z.array(timelineEventSchema), ...pageFields });

export type Timeline = z.infer<typeof timelineSchema>;

/**
 * The GDPR export, checked for its shape but kept whole: the admin's file
 * holds everything the server sent (passthrough keeps unknown keys).
 */
export const investorExportSchema = z
  .object({
    exportedAt: z.string(),
    investor: adminInvestorSchema.passthrough(),
    sessions: z.array(z.record(z.unknown())),
    events: z.array(z.record(z.unknown())),
  })
  .passthrough();

export type InvestorExport = z.infer<typeof investorExportSchema>;

const blockAnswerSchema = z.object({ investor: adminInvestorSchema });

const investorPath = (id: string) => `/admin/investors/${encodeURIComponent(id)}`;

/** search: the list's query string from investors-query.ts (apiSearch), "" or starting with "?". */
export function fetchInvestors(search: string, signal?: AbortSignal): Promise<InvestorList> {
  return fetchJson(`/admin/investors${search}`, { schema: investorListSchema, signal });
}

export function fetchInvestor(id: string, signal?: AbortSignal): Promise<InvestorDetail> {
  return fetchJson(investorPath(id), { schema: investorDetailSchema, signal });
}

/** 50 events a page, newest first. */
export function fetchTimeline(id: string, page: number, signal?: AbortSignal): Promise<Timeline> {
  return fetchJson(`${investorPath(id)}/events?page=${page}`, { schema: timelineSchema, signal });
}

export async function setInvestorBlocked(id: string, blocked: boolean): Promise<AdminInvestor> {
  const answer = await fetchJson(investorPath(id), { method: "PATCH", body: { blocked }, schema: blockAnswerSchema });
  return answer.investor;
}

/** 204: no body. Sessions, events and alert records go with the row; the Clerk account stays. */
export async function deleteInvestor(id: string): Promise<void> {
  await fetchJson(investorPath(id), { method: "DELETE", schema: z.null() });
}

export function fetchInvestorExport(id: string): Promise<InvestorExport> {
  return fetchJson(`${investorPath(id)}/export`, { schema: investorExportSchema });
}
