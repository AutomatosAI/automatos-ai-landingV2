import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { requestDocumentLink } from "@/documents/documents-api";

import { afterLoadError, FIRST_CYCLE, retryCycle, viewerPhase, type LinkRequest, type ViewerPhase } from "./link-model";

/**
 * Its own root, not under documentsKey: refreshing the library must never
 * ask for a link, since every link the server issues is recorded as an open
 * (KP16).
 */
export function viewerLinkKey(userId: string, documentId: string, generation: number) {
  return ["document-link", userId, documentId, generation] as const;
}

export interface ViewerLink {
  readonly phase: ViewerPhase;
  /** pdf.js could not load the link (link-model.ts afterLoadError decides what next). */
  readonly onLoadError: (error: unknown) => void;
  /** A new link and a fresh renewal. */
  readonly retry: () => void;
}

function asRequest(query: { status: "pending" | "error" | "success"; error: unknown; data?: { url: string } }): LinkRequest {
  if (query.status === "error") return { status: "error", error: query.error };
  if (query.status === "success" && query.data) return { status: "success", url: query.data.url };
  return { status: "pending" };
}

/**
 * The inline link for the viewer: asked for once on open (the server records
 * the open), never refetched on focus or reconnect, dropped when the viewer
 * closes (gcTime 0), so opening the document again is a new open.
 */
export function useViewerLink(userId: string, documentId: string, enabled: boolean): ViewerLink {
  const [cycle, setCycle] = useState(FIRST_CYCLE);
  const query = useQuery({
    queryKey: viewerLinkKey(userId, documentId, cycle.generation),
    queryFn: ({ signal }) => requestDocumentLink(documentId, "inline", signal),
    enabled,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const onLoadError = useCallback((error: unknown) => setCycle((current) => afterLoadError(current, error)), []);
  const retry = useCallback(() => setCycle(retryCycle), []);
  return { phase: viewerPhase(cycle, asRequest(query)), onLoadError, retry };
}
