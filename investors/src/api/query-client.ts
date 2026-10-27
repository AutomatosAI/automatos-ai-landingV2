import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuthState } from "@/auth";

import { ApiError, type ApiErrorKind } from "./errors";

const MAX_RETRIES = 2;
const RETRYABLE: ReadonlySet<ApiErrorKind> = new Set(["network", "server"]);

/** Only a dropped connection or a 5xx is worth asking again; an answer like 401 or 403 stands. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  return error instanceof ApiError && RETRYABLE.has(error.kind);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

/** Drops every cached answer when nobody is signed in, so nothing outlives the session. */
export function useClearCacheOnSignOut(): void {
  const queryClient = useQueryClient();
  const { status } = useAuthState();
  useEffect(() => {
    if (status !== "signed_in") queryClient.clear();
  }, [status, queryClient]);
}
