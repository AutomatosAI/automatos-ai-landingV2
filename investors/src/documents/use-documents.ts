import { useQuery } from "@tanstack/react-query";

import { fetchDocuments } from "./documents-api";

/** Keyed by the Clerk user, like /me: nothing is shown to the next person signed in. */
export function documentsKey(userId: string) {
  return ["documents", userId] as const;
}

export function useDocuments(userId: string) {
  return useQuery({ queryKey: documentsKey(userId), queryFn: ({ signal }) => fetchDocuments(signal) });
}
