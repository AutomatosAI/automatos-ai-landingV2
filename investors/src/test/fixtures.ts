import type { AdminDocument } from "@/admin/documents-api";
import type {
  AdminInvestor,
  DocumentSummary,
  InvestorList,
  InvestorRow,
  Timeline,
  TimelineEvent,
} from "@/admin/investors-api";
import type { LatestEvent, Overview } from "@/admin/overview-api";
import type { Me } from "@/api/me";
import type { InvestorDocument } from "@/documents/documents-api";

/** A new investor as GET /me answers before the profile is saved (KP5: invented). */
export const NEW_ADA: Me = {
  investor: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "ada@example.com",
    name: "Ada Example",
    firm: null,
    title: null,
    investorType: null,
    chequeSize: null,
    linkedinUrl: null,
    country: null,
    source: null,
    marketingOptIn: false,
  },
  isAdmin: false,
  profileComplete: false,
};

/** The same investor once the profile is saved. */
export const ADA_ME: Me = {
  ...NEW_ADA,
  investor: {
    ...NEW_ADA.investor,
    firm: "Example Ventures",
    title: "Partner",
    investorType: "vc",
    chequeSize: "250k_1m",
    linkedinUrl: "https://www.linkedin.com/in/ada-example",
    country: "Ireland",
    source: "websummit",
  },
  profileComplete: true,
};

/** The same investor as an admin (INVESTOR_ADMIN_CLERK_IDS on the server). */
export const ADMIN_ME: Me = { ...ADA_ME, isAdmin: true };

/** An invented document as the admin API answers it. */
export function adminDocument(overrides: Partial<AdminDocument> = {}): AdminDocument {
  return {
    id: "00000000-0000-4000-8000-0000000000d1",
    title: "Example deck",
    description: "The company in twelve slides.",
    category: "Pitch",
    kind: "pdf",
    fileName: "example-deck.pdf",
    contentType: "application/pdf",
    sizeBytes: 1_572_864,
    pageCount: 12,
    version: 1,
    sortOrder: 0,
    published: false,
    alertOnFirstOpen: false,
    hasFile: true,
    createdAt: "2026-10-20T12:00:00.000Z",
    updatedAt: "2026-10-21T12:00:00.000Z",
    ...overrides,
  };
}

/** An invented published document as GET /documents answers it. */
export function investorDocument(overrides: Partial<InvestorDocument> = {}): InvestorDocument {
  return {
    id: "00000000-0000-4000-8000-0000000000d1",
    title: "Example deck",
    description: "The company in twelve slides.",
    category: "Pitch",
    kind: "pdf",
    fileName: "example-deck.pdf",
    contentType: "application/pdf",
    sizeBytes: 1_572_864,
    pageCount: 12,
    version: 1,
    updatedAt: "2026-10-21T12:00:00.000Z",
    ...overrides,
  };
}

/** An invented event as GET /admin/overview lists it: Ada opening the deck. */
export function latestEvent(overrides: Partial<LatestEvent> = {}): LatestEvent {
  return {
    id: 1,
    type: "document_open",
    documentId: "00000000-0000-4000-8000-0000000000d1",
    documentTitle: "Example deck",
    page: null,
    durationMs: null,
    data: null,
    createdAt: "2026-10-27T12:00:00.000Z",
    investorId: NEW_ADA.investor.id,
    investorName: "Ada Example",
    investorFirm: "Example Ventures",
    investorEmail: "ada@example.com",
    ...overrides,
  };
}

/** An invented GET /admin/overview answer: 30 zero days ending 27 Oct 2026, unless told otherwise. */
export function overviewAnswer(overrides: Partial<Overview> = {}): Overview {
  const series = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 9, 27 - 29 + i)).toISOString().slice(0, 10),
    signups: 0,
    activeInvestors: 0,
  }));
  return {
    investorsTotal: 0,
    investorsNew7d: 0,
    activeInvestors7d: 0,
    deckOpens7d: 0,
    downloads7d: 0,
    series,
    latestEvents: [],
    ...overrides,
  };
}

/** Ada as a row of GET /admin/investors: two visits, the deck read to page 9 of 12. */
export function investorRow(overrides: Partial<InvestorRow> = {}): InvestorRow {
  return {
    id: NEW_ADA.investor.id,
    name: "Ada Example",
    email: "ada@example.com",
    firm: "Example Ventures",
    investorType: "vc",
    chequeSize: "250k_1m",
    source: "websummit",
    createdAt: "2026-10-20T12:00:00.000Z",
    lastSeenAt: "2026-10-27T12:00:00.000Z",
    sessions: 2,
    totalMs: 200_000,
    docsOpened: 1,
    downloads: 1,
    deckProgress: { documentId: "00000000-0000-4000-8000-0000000000d1", maxPage: 9, pageCount: 12 },
    blocked: false,
    ...overrides,
  };
}

/** A GET /admin/investors answer holding these rows. */
export function investorList(investors: readonly InvestorRow[], overrides: Partial<InvestorList> = {}): InvestorList {
  return { investors: [...investors], total: investors.length, page: 1, pageSize: 50, ...overrides };
}

/** Ada's whole row as GET /admin/investors/:id answers it. */
export function adminInvestor(overrides: Partial<AdminInvestor> = {}): AdminInvestor {
  return {
    id: NEW_ADA.investor.id,
    clerkUserId: "user_ada",
    email: "ada@example.com",
    name: "Ada Example",
    firm: "Example Ventures",
    title: "Partner",
    investorType: "vc",
    linkedinUrl: "https://www.linkedin.com/in/ada-example",
    chequeSize: "250k_1m",
    country: "Ireland",
    source: "websummit",
    marketingOptIn: true,
    marketingOptInAt: "2026-10-20T12:05:00.000Z",
    profileCompletedAt: "2026-10-20T12:05:00.000Z",
    blocked: false,
    createdAt: "2026-10-20T12:00:00.000Z",
    lastSeenAt: "2026-10-27T12:00:00.000Z",
    ...overrides,
  };
}

/** Ada and the deck: opened twice, read to page 9 of 12, downloaded. */
export function documentSummary(overrides: Partial<DocumentSummary> = {}): DocumentSummary {
  return {
    documentId: "00000000-0000-4000-8000-0000000000d1",
    title: "Example deck",
    kind: "pdf",
    pageCount: 12,
    opens: 2,
    furthestPage: 9,
    timeMs: 200_000,
    downloaded: true,
    ...overrides,
  };
}

/** One of Ada's events: reading page 4 of the deck for 20 seconds. */
export function timelineEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 1,
    type: "page_view",
    sessionId: "00000000-0000-4000-8000-00000000005e",
    documentId: "00000000-0000-4000-8000-0000000000d1",
    documentTitle: "Example deck",
    documentVersion: 1,
    page: 4,
    durationMs: 20_000,
    data: null,
    createdAt: "2026-10-27T12:00:09.000Z",
    ...overrides,
  };
}

/** A GET /admin/investors/:id/events answer holding these events. */
export function timelineAnswer(events: readonly TimelineEvent[], overrides: Partial<Timeline> = {}): Timeline {
  return { events: [...events], total: events.length, page: 1, pageSize: 50, ...overrides };
}
