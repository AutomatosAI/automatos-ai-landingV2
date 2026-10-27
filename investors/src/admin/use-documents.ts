import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  createDocument,
  deleteDocument,
  editDocument,
  fetchAdminDocuments,
  type AdminDocument,
  type DocumentPatch,
} from "./documents-api";
import { removeDocument, sortDocuments, upsertDocument, type SortChange } from "./documents-model";

/** Keyed by the Clerk user, like /me: nothing is shown to the next person signed in. */
export function adminDocumentsKey(userId: string) {
  return ["admin", "documents", userId] as const;
}

export function useAdminDocuments(userId: string) {
  return useQuery({
    queryKey: adminDocumentsKey(userId),
    queryFn: async ({ signal }) => sortDocuments(await fetchAdminDocuments(signal)),
  });
}

export interface DocumentsCache {
  /** Writes one answer from the server into the cached list. */
  readonly put: (document: AdminDocument) => void;
  readonly remove: (id: string) => void;
  /** Asks the server for the list again. */
  readonly refresh: () => void;
}

export function useDocumentsCache(userId: string): DocumentsCache {
  const queryClient = useQueryClient();
  return useMemo(() => {
    const key = adminDocumentsKey(userId);
    const update = (change: (list: readonly AdminDocument[]) => readonly AdminDocument[]) =>
      queryClient.setQueryData<readonly AdminDocument[]>(key, (list) => (list ? change(list) : list));
    return {
      put: (document) => update((list) => upsertDocument(list, document)),
      remove: (id) => update((list) => removeDocument(list, id)),
      refresh: () => void queryClient.invalidateQueries({ queryKey: key }),
    };
  }, [queryClient, userId]);
}

export function useCreateDocument(userId: string) {
  const cache = useDocumentsCache(userId);
  return useMutation({ mutationFn: createDocument, onSuccess: cache.put });
}

export function useEditDocument(userId: string) {
  const cache = useDocumentsCache(userId);
  return useMutation({
    mutationFn: ({ id, patch }: { readonly id: string; readonly patch: DocumentPatch }) => editDocument(id, patch),
    onSuccess: cache.put,
  });
}

export function useDeleteDocument(userId: string) {
  const cache = useDocumentsCache(userId);
  return useMutation({ mutationFn: deleteDocument, onSuccess: (_answer, id) => cache.remove(id) });
}

/**
 * Sends a move's PATCHes (documents-model.ts reorderPlan); the answers move
 * the rows at once, then the list is read again either way, so a half-applied
 * move shows the order the server holds.
 */
export function useReorderDocuments(userId: string) {
  const cache = useDocumentsCache(userId);
  return useMutation({
    mutationFn: (changes: readonly SortChange[]) =>
      Promise.all(changes.map(({ id, sortOrder }) => editDocument(id, { sortOrder }))),
    onSuccess: (documents) => documents.forEach(cache.put),
    onSettled: cache.refresh,
  });
}
