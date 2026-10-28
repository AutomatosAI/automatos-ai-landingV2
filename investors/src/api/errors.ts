/**
 * What can go wrong calling /api/investors, and which screen says so. The
 * server answers {error:'<code>'} with a status (server/investors/index.js,
 * auth.js); the client never shows the code itself.
 */

export type ApiErrorKind =
  | "unauthenticated"
  | "blocked"
  | "email_required"
  | "forbidden"
  | "not_found"
  | "invalid"
  | "rate_limited"
  | "unavailable"
  | "storage_unavailable"
  | "server"
  | "network"
  | "bad_response";

interface ApiErrorInit {
  readonly kind: ApiErrorKind;
  readonly status?: number | null;
  readonly code?: string | null;
  readonly fields?: Readonly<Record<string, string>>;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** The HTTP status, or null when no response arrived. */
  readonly status: number | null;
  /** The server's {error} code, when it sent one. */
  readonly code: string | null;
  /** Field errors from a 400 {error:'invalid', fields}. */
  readonly fields: Readonly<Record<string, string>>;

  constructor({ kind, status = null, code = null, fields = {} }: ApiErrorInit) {
    super(`investors api: ${kind}${status === null ? "" : ` (${status})`}`);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.fields = Object.freeze({ ...fields });
  }
}

// A Map, not an object: a code like 'toString' must not find a prototype member.
const FORBIDDEN_CODES: ReadonlyMap<string, ApiErrorKind> = new Map([
  ["blocked", "blocked"],
  ["email_required", "email_required"],
]);

export function errorKindFor(status: number, code: string | null): ApiErrorKind {
  if (status === 401) return "unauthenticated";
  if (status === 403) return (code !== null && FORBIDDEN_CODES.get(code)) || "forbidden";
  if (status === 404) return "not_found";
  if (status === 400 || status === 413 || status === 422) return "invalid";
  if (status === 429) return "rate_limited";
  if (status === 503) return code === "storage_unavailable" ? "storage_unavailable" : "unavailable";
  return "server";
}

export type ErrorScreen =
  | "sign_in"
  | "blocked"
  | "email_required"
  | "not_available"
  | "not_found"
  | "unavailable"
  | "storage_unavailable"
  | "error";

const SCREEN_FOR_KIND: Readonly<Record<ApiErrorKind, ErrorScreen>> = {
  unauthenticated: "sign_in",
  blocked: "blocked",
  email_required: "email_required",
  forbidden: "not_available",
  not_found: "not_found",
  unavailable: "unavailable",
  storage_unavailable: "storage_unavailable",
  invalid: "error",
  rate_limited: "error",
  server: "error",
  network: "error",
  bad_response: "error",
};

/**
 * 401 → sign in again, 403 blocked → the blocked screen, 503 → unavailable
 * (document storage down → storage_unavailable); anything unknown → error.
 */
export function screenForError(error: unknown): ErrorScreen {
  return error instanceof ApiError ? SCREEN_FOR_KIND[error.kind] : "error";
}

/**
 * Document storage is down (503 storage_unavailable): the portal still works,
 * so a page keeps its content and shows a note where the documents would be.
 */
export function isStorageUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.kind === "storage_unavailable";
}
