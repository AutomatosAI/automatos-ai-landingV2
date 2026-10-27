import type { AdminDocument } from "../../src/admin/documents-api";
import type { InvestorDetail, InvestorList, Timeline } from "../../src/admin/investors-api";
import type { Overview } from "../../src/admin/overview-api";
import type { InvestorDocument } from "../../src/documents/documents-api";
import {
  ADA_ME,
  adminDocument,
  adminInvestor,
  documentSummary,
  investorDocument,
  investorList,
  investorRow,
  latestEvent,
  overviewAnswer,
  timelineAnswer,
  timelineEvent,
} from "../../src/test/fixtures";

import { PDF_PAGE_COUNT } from "./pdf";

/*
 * What the mocked API answers (KP5: every name, firm and address is
 * invented; example.com only). Built from the unit tests' fixtures, so the
 * shapes are the app's own zod types and a schema change breaks typecheck
 * here rather than the screenshots in CI.
 */

export const ADA_ID = ADA_ME.investor.id;
export const BEN_ID = "00000000-0000-4000-8000-000000000002";
export const CARA_ID = "00000000-0000-4000-8000-000000000003";
export const DAN_ID = "00000000-0000-4000-8000-000000000004";

/** The deck: a PDF of PDF_PAGE_COUNT pages, served by the PDF fixture. */
export const DECK_ID = "00000000-0000-4000-8000-0000000000d1";
const ONE_PAGER_ID = "00000000-0000-4000-8000-0000000000d2";
const MODEL_ID = "00000000-0000-4000-8000-0000000000d3";
/** The video: its storage link is answered by routeVideo (api.ts). */
export const DEMO_ID = "00000000-0000-4000-8000-0000000000d4";
const DRAFT_ID = "00000000-0000-4000-8000-0000000000d5";
/** A longer PDF, for the page charts of the document stats (stats.ts); never opened in the viewer. */
export const MEMO_ID = "00000000-0000-4000-8000-0000000000d6";
export const MEMO_PAGE_COUNT = 8;

export const SESSION_ID = "00000000-0000-4000-8000-00000000005e";

/** GET /documents: the published library. */
export const LIBRARY: readonly InvestorDocument[] = [
  investorDocument({ id: DECK_ID, pageCount: PDF_PAGE_COUNT, sizeBytes: 1_167 }),
  investorDocument({
    id: ONE_PAGER_ID,
    title: "Example one-pager",
    description: "The company on one page.",
    fileName: "example-one-pager.pdf",
    sizeBytes: 245_760,
    pageCount: 1,
  }),
  investorDocument({
    id: MODEL_ID,
    title: "Example financial model",
    description: "Revenue, costs and hiring by quarter.",
    category: "Business model",
    kind: "spreadsheet",
    fileName: "example-model.xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeBytes: 86_016,
    pageCount: null,
  }),
  investorDocument({
    id: DEMO_ID,
    title: "Example product demo",
    description: "A short walk through the product.",
    category: "Product",
    kind: "video",
    fileName: "example-demo.mp4",
    contentType: "video/mp4",
    sizeBytes: 48_234_496,
    pageCount: null,
  }),
  investorDocument({
    id: MEMO_ID,
    title: "Example market memo",
    description: "The market, in eight invented pages.",
    category: "Market",
    fileName: "example-market-memo.pdf",
    sizeBytes: 412_672,
    pageCount: MEMO_PAGE_COUNT,
    version: 2,
  }),
];

/** GET /admin/documents: the library as the admin sees it, plus a draft with no file yet. */
export const ADMIN_DOCUMENTS: readonly AdminDocument[] = [
  ...LIBRARY.map((document, sortOrder) =>
    adminDocument({ ...document, sortOrder, published: true, alertOnFirstOpen: document.id === DECK_ID }),
  ),
  adminDocument({
    id: DRAFT_ID,
    title: "Example team page",
    description: null,
    category: "Team",
    fileName: null,
    contentType: null,
    sizeBytes: null,
    pageCount: null,
    sortOrder: LIBRARY.length,
    hasFile: false,
  }),
];

/** A 30-day series with a little activity, deterministic. */
const ACTIVITY = [0, 1, 0, 2, 1, 0, 0, 3, 1, 2, 0, 1, 4, 2, 1, 0, 2, 3, 1, 0, 1, 2, 5, 3, 2, 1, 0, 2, 3, 4];

/** GET /admin/overview. */
export const OVERVIEW: Overview = overviewAnswer({
  investorsTotal: 4,
  investorsNew7d: 2,
  activeInvestors7d: 3,
  deckOpens7d: 5,
  downloads7d: 2,
  series: overviewAnswer().series.map((day, i) => ({
    ...day,
    signups: i % 9 === 4 ? 1 : 0,
    activeInvestors: ACTIVITY[i] ?? 0,
  })),
  latestEvents: [
    latestEvent({ id: 6, type: "document_download", createdAt: "2026-10-27T12:04:00.000Z" }),
    latestEvent({ id: 5, type: "page_view", page: 2, durationMs: 40_000, createdAt: "2026-10-27T12:02:00.000Z" }),
    latestEvent({ id: 4, createdAt: "2026-10-27T12:00:00.000Z" }),
    latestEvent({
      id: 3,
      type: "profile_completed",
      documentId: null,
      documentTitle: null,
      createdAt: "2026-10-26T09:30:00.000Z",
      investorId: BEN_ID,
      investorName: "Ben Sample",
      investorFirm: "Sample Capital",
      investorEmail: "ben@example.com",
    }),
  ],
});

/** GET /admin/investors: four invented investors, one blocked. */
export const INVESTORS: InvestorList = investorList([
  investorRow(),
  investorRow({
    id: BEN_ID,
    name: "Ben Sample",
    email: "ben@example.com",
    firm: "Sample Capital",
    investorType: "angel",
    chequeSize: "50k_250k",
    source: "intro",
    createdAt: "2026-10-26T09:00:00.000Z",
    lastSeenAt: "2026-10-26T09:45:00.000Z",
    sessions: 1,
    totalMs: 95_000,
    docsOpened: 2,
    downloads: 0,
    deckProgress: { documentId: DECK_ID, maxPage: 1, pageCount: PDF_PAGE_COUNT },
  }),
  investorRow({
    id: CARA_ID,
    name: "Cara Placeholder",
    email: "cara@example.com",
    firm: "Placeholder Partners",
    investorType: "family_office",
    chequeSize: null,
    source: "website",
    createdAt: "2026-10-22T15:00:00.000Z",
    lastSeenAt: "2026-10-22T15:10:00.000Z",
    sessions: 1,
    totalMs: 0,
    docsOpened: 0,
    downloads: 0,
    deckProgress: null,
  }),
  investorRow({
    id: DAN_ID,
    name: null,
    email: "dan@example.com",
    firm: null,
    investorType: null,
    chequeSize: null,
    source: null,
    createdAt: "2026-10-21T08:00:00.000Z",
    lastSeenAt: "2026-10-21T08:00:00.000Z",
    sessions: 0,
    totalMs: 0,
    docsOpened: 0,
    downloads: 0,
    deckProgress: null,
    blocked: true,
  }),
]);

/** GET /admin/investors/:id for Ada. */
export const ADA_DETAIL: InvestorDetail = {
  investor: adminInvestor(),
  documents: [
    documentSummary({ pageCount: PDF_PAGE_COUNT, furthestPage: 2, timeMs: 70_000 }),
    documentSummary({
      documentId: MODEL_ID,
      title: "Example financial model",
      kind: "spreadsheet",
      pageCount: null,
      opens: 0,
      furthestPage: 0,
      timeMs: 0,
      downloaded: true,
    }),
  ],
};

/** GET /admin/investors/:id/events?page=1 for Ada, newest first. */
export const ADA_TIMELINE: Timeline = timelineAnswer([
  timelineEvent({
    id: 7,
    type: "document_download",
    documentId: MODEL_ID,
    documentTitle: "Example financial model",
    page: null,
    durationMs: null,
    createdAt: "2026-10-27T12:04:00.000Z",
  }),
  timelineEvent({ id: 6, page: 2, durationMs: 40_000, createdAt: "2026-10-27T12:02:00.000Z" }),
  timelineEvent({ id: 5, page: 1, durationMs: 30_000, createdAt: "2026-10-27T12:01:20.000Z" }),
  timelineEvent({ id: 4, type: "document_open", sessionId: null, page: null, durationMs: null, createdAt: "2026-10-27T12:01:00.000Z" }),
  timelineEvent({
    id: 3,
    type: "profile_completed",
    documentId: null,
    documentTitle: null,
    documentVersion: null,
    page: null,
    durationMs: null,
    createdAt: "2026-10-20T12:05:00.000Z",
  }),
  timelineEvent({
    id: 2,
    type: "signed_in",
    documentId: null,
    documentTitle: null,
    documentVersion: null,
    page: null,
    durationMs: null,
    createdAt: "2026-10-20T12:00:00.000Z",
  }),
]);
