import { API_BASE, fetchJson } from "@/api/client";
import { ApiError, type ApiErrorKind } from "@/api/errors";

import { sessionSchema, type EventBatch } from "./events";

/*
 * The tracker's two requests. Both carry the Bearer token and nothing else
 * (KP9): no cookie, and no sendBeacon, which cannot set the header. The
 * pagehide flush cannot wait for a fresh token, so postEvents takes the
 * token it is given and sends with keepalive, which lets the request finish
 * after the page has gone.
 */

export const EVENTS_URL = `${API_BASE}/events`;

/** sent; worth sending again (no answer, a 5xx, the rate limit); or never accepted (any other 4xx). */
export type SendOutcome = "sent" | "retry" | "dropped";

export function outcomeFor(status: number): SendOutcome {
  if (status >= 200 && status < 300) return "sent";
  return status === 429 || status >= 500 ? "retry" : "dropped";
}

export async function postEvents(batch: EventBatch, token: string, keepalive: boolean): Promise<SendOutcome> {
  try {
    const response = await fetch(EVENTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
      credentials: "omit",
      cache: "no-store",
      keepalive,
    });
    return outcomeFor(response.status);
  } catch {
    return "retry";
  }
}

/** Opens a visit (POST /sessions) and resolves its id. Rejects with an ApiError. */
export async function openSession(): Promise<string> {
  const { sessionId } = await fetchJson("/sessions", { method: "POST", body: {}, schema: sessionSchema });
  return sessionId;
}

/** Answers that asking again will not change: the investor may not use the portal. */
const REFUSED: ReadonlySet<ApiErrorKind> = new Set(["blocked", "email_required", "forbidden"]);

/** A failed openSession that is not worth trying again. */
export function sessionRefused(error: unknown): boolean {
  return error instanceof ApiError && REFUSED.has(error.kind);
}
