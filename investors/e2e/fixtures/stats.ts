import type { DocumentStats, PageStats, Reader } from "../../src/admin/document-stats-api";

import { ADA_ID, ADMIN_DOCUMENTS, BEN_ID, CARA_ID, DAN_ID, MEMO_ID, MEMO_PAGE_COUNT } from "./data";

/*
 * GET /admin/documents/:id/stats for the market memo, version 2 (KP5:
 * invented). Four readers: two stop after page 2, one after page 5, one
 * reads to the end. The numbers agree with each other the way the server
 * works them out: readers reaching a page are those whose furthest page is
 * at least that page, and the readers' times add up to the pages' dwell.
 */

const memo = ADMIN_DOCUMENTS.find((document) => document.id === MEMO_ID);
if (memo === undefined) throw new Error("e2e fixtures: the memo is missing from ADMIN_DOCUMENTS");

/** Average seconds on each page, over the readers who viewed it. */
const DWELL_SECONDS = [35, 52, 41, 47, 18, 24, 9, 6] as const;

const READERS: readonly Reader[] = [
  {
    investorId: ADA_ID,
    name: "Ada Example",
    firm: "Example Ventures",
    furthestPage: MEMO_PAGE_COUNT,
    timeMs: 243_000,
    downloaded: true,
    lastOpenAt: "2026-10-27T11:40:00.000Z",
  },
  {
    investorId: BEN_ID,
    name: "Ben Sample",
    firm: "Sample Capital",
    furthestPage: 5,
    timeMs: 204_000,
    downloaded: false,
    lastOpenAt: "2026-10-26T09:30:00.000Z",
  },
  {
    investorId: CARA_ID,
    name: "Cara Placeholder",
    firm: "Placeholder Partners",
    furthestPage: 2,
    timeMs: 78_000,
    downloaded: false,
    lastOpenAt: "2026-10-22T15:05:00.000Z",
  },
  { investorId: DAN_ID, name: null, firm: null, furthestPage: 2, timeMs: 74_000, downloaded: false, lastOpenAt: "2026-10-21T08:00:00.000Z" },
];

function pageStats(page: number): PageStats {
  const readersReached = READERS.filter((reader) => reader.furthestPage >= page).length;
  return {
    page,
    avgDwellMs: (DWELL_SECONDS[page - 1] ?? 0) * 1000,
    readersReached,
    pctReached: Math.round((readersReached / READERS.length) * 1000) / 10,
  };
}

const totalMs = READERS.reduce((sum, reader) => sum + reader.timeMs, 0);

export const MEMO_STATS: DocumentStats = {
  document: memo,
  version: memo.version,
  versions: [memo.version, memo.version - 1],
  uniqueReaders: READERS.length,
  opens: 6,
  downloads: READERS.filter((reader) => reader.downloaded).length,
  avgTimeMs: Math.round(totalMs / READERS.length),
  pages: Array.from({ length: MEMO_PAGE_COUNT }, (_, i) => pageStats(i + 1)),
  readers: [...READERS],
};
