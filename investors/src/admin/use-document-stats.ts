import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchDocumentStats } from "./document-stats-api";

/** Keyed by the Clerk user, like /me: nothing is shown to the next person signed in. */
export function documentStatsKey(userId: string, id: string, version: number | null) {
  return ["admin", "document-stats", userId, id, version ?? "current"] as const;
}

/** version null: the current one. The last version shown stays on screen while the next loads. */
export function useDocumentStats(userId: string, id: string, version: number | null) {
  return useQuery({
    queryKey: documentStatsKey(userId, id, version),
    queryFn: ({ signal }) => fetchDocumentStats(id, version, signal),
    placeholderData: keepPreviousData,
  });
}
