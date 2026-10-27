import { adminDocument } from "@/test/fixtures";

import type { DocumentStats, PageStats, Reader } from "../document-stats-api";

/** Invented readers (KP5). */
export const ADA_ID = "00000000-0000-4000-8000-000000000001";
export const BEN_ID = "00000000-0000-4000-8000-0000000000b2";
export const CY_ID = "00000000-0000-4000-8000-0000000000c3";
export const DEE_ID = "00000000-0000-4000-8000-0000000000d4";

/** A reader as GET /admin/documents/:id/stats answers one. */
export function reader(overrides: Partial<Reader> = {}): Reader {
  return {
    investorId: ADA_ID,
    name: "Ada Example",
    firm: "Example Ventures",
    furthestPage: 3,
    timeMs: 65_000,
    downloaded: true,
    lastOpenAt: "2026-10-27T12:05:00.000Z",
    ...overrides,
  };
}

/** Five pages: of four readers, three reach page 2, two page 3 and one the end. */
export const FIVE_PAGES: readonly PageStats[] = [
  { page: 1, avgDwellMs: 12_345, readersReached: 3, pctReached: 75 },
  { page: 2, avgDwellMs: 40_000, readersReached: 3, pctReached: 75 },
  { page: 3, avgDwellMs: 8_000, readersReached: 2, pctReached: 50 },
  { page: 4, avgDwellMs: 0, readersReached: 1, pctReached: 25 },
  { page: 5, avgDwellMs: 5_000, readersReached: 1, pctReached: 25 },
];

/** Version 2 (the current one) of a five-page deck and its four readers, newest open first. */
export function documentStats(overrides: Partial<DocumentStats> = {}): DocumentStats {
  return {
    document: adminDocument({ title: "Example deck", pageCount: 5, version: 2 }),
    version: 2,
    versions: [2, 1],
    uniqueReaders: 4,
    opens: 6,
    downloads: 2,
    avgTimeMs: 200_000,
    pages: [...FIVE_PAGES],
    readers: [
      reader(),
      reader({ investorId: BEN_ID, name: "Ben Sample", firm: null, furthestPage: 5, downloaded: false }),
      reader({ investorId: CY_ID, name: "Cy Placeholder", firm: "Placeholder Fund", furthestPage: 2, downloaded: false }),
      reader({ investorId: DEE_ID, name: null, firm: null, furthestPage: 0, timeMs: 0, lastOpenAt: null }),
    ],
    ...overrides,
  };
}

/** A video: no page count, so no pages. */
export function videoStats(overrides: Partial<DocumentStats> = {}): DocumentStats {
  return documentStats({
    document: adminDocument({
      title: "Example demo",
      kind: "video",
      fileName: "example-demo.mp4",
      contentType: "video/mp4",
      pageCount: null,
      version: 1,
    }),
    version: 1,
    versions: [1],
    avgTimeMs: 0,
    pages: [],
    readers: [reader({ furthestPage: 0, timeMs: 0 })],
    uniqueReaders: 1,
    opens: 2,
    downloads: 1,
    ...overrides,
  });
}
