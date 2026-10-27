import type { AdminDocument } from "@/admin/documents-api";
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
