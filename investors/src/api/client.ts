import { z } from "zod";

import { getToken } from "@/auth";

import { ApiError, errorKindFor } from "./errors";

/** Same origin: the site's server mounts the API here (server.js). */
export const API_BASE = "/api/investors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface FetchJsonOptions<T> {
  readonly method?: HttpMethod;
  /** Sent as JSON. */
  readonly body?: unknown;
  /** Every response is parsed (KP15); a mismatch is a bad_response error. */
  readonly schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  readonly signal?: AbortSignal;
}

const errorBodySchema = z.object({
  error: z.string(),
  fields: z.record(z.string()).optional(),
});

async function bearerToken(): Promise<string> {
  let token: string | null;
  try {
    token = await getToken();
  } catch {
    throw new ApiError({ kind: "network" });
  }
  if (!token) throw new ApiError({ kind: "unauthenticated" });
  return token;
}

function requestInit(method: HttpMethod, body: unknown, token: string, signal?: AbortSignal): RequestInit {
  const headers: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${token}` };
  const hasBody = body !== undefined;
  return {
    method,
    headers: hasBody ? { ...headers, "Content-Type": "application/json" } : headers,
    body: hasBody ? JSON.stringify(body) : undefined,
    // The Bearer token is the only credential (KP9): no cookies go with it.
    credentials: "omit",
    cache: "no-store",
    signal,
  };
}

/** The body as JSON; null for an empty body; undefined when it is not JSON. */
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function errorFrom(status: number, payload: unknown): ApiError {
  const parsed = errorBodySchema.safeParse(payload);
  const code = parsed.success ? parsed.data.error : null;
  const fields = parsed.success ? parsed.data.fields : undefined;
  return new ApiError({ kind: errorKindFor(status, code), status, code, fields });
}

/**
 * Calls the portal API with the visitor's token. Rejects with an ApiError
 * whose kind picks the screen (errors.ts screenForError).
 */
export async function fetchJson<T>(path: string, { method = "GET", body, schema, signal }: FetchJsonOptions<T>): Promise<T> {
  if (!path.startsWith("/")) throw new TypeError(`fetchJson: path must start with '/': ${path}`);
  const token = await bearerToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, requestInit(method, body, token, signal));
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError({ kind: "network" });
  }
  const payload = await readJson(response);
  if (!response.ok) throw errorFrom(response.status, payload);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ApiError({ kind: "bad_response", status: response.status });
  return parsed.data;
}
