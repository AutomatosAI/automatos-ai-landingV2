import type { TokenSource } from "./types";

/*
 * The session token, reachable outside React: the API client asks for a
 * fresh one per request, and the pagehide flush (fetch keepalive, KP9) uses
 * the last one it saw because it cannot wait. The active provider is the
 * only writer.
 */
let source: TokenSource | null = null;
let last: string | null = null;

export function setTokenSource(next: TokenSource | null): void {
  source = next;
  if (next === null) last = null;
}

/** A current token, or null when signed out. Rejects when the provider cannot reach its service. */
export async function getToken(): Promise<string | null> {
  if (source === null) return null;
  const token = await source();
  last = token;
  return token;
}

/** The token from the latest getToken(), without asking again. */
export function lastToken(): string | null {
  return last;
}
