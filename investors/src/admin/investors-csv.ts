import { z } from "zod";

import { API_BASE } from "@/api/client";
import { ApiError, errorKindFor } from "@/api/errors";
import { getToken } from "@/auth";

import { apiSearch, type InvestorsQuery } from "./investors-query";
import { saveBlob } from "./save-file";

/**
 * "Export CSV" (US-012): GET /admin/investors.csv with the table's search,
 * filters and sort, every page of it. The server writes the file (escaping
 * and formula-injection guard in server/investors/csv.js); the app fetches
 * it with the Bearer token, checks it is a CSV, and saves it as a blob.
 */

const CSV_PATH = "/admin/investors.csv";

/** The server's name for the file: 'investors-YYYY-MM-DD.csv' (its UTC day). */
const SERVER_FILE_NAME = /^attachment;\s*filename="(investors-\d{4}-\d{2}-\d{2}\.csv)"$/i;

const CSV_TYPE = /^text\/csv(;|$)/i;

const errorBodySchema = z.object({ error: z.string() });

/** The CSV's query string: the table's view without its page (the file is every page). */
export function csvSearch(query: InvestorsQuery): string {
  return apiSearch({ ...query, page: 1 });
}

/** The name the server gave the file, else the same name for the UTC day now. */
export function csvFileName(contentDisposition: string | null, now: Date): string {
  const match = contentDisposition === null ? null : SERVER_FILE_NAME.exec(contentDisposition.trim());
  return match?.[1] ?? `investors-${now.toISOString().slice(0, 10)}.csv`;
}

/** As api/client.ts asks for one: a provider failure is a network error, no token is signed out. */
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

async function errorFrom(response: Response): Promise<ApiError> {
  const payload: unknown = await response.json().catch(() => null);
  const parsed = errorBodySchema.safeParse(payload);
  const code = parsed.success ? parsed.data.error : null;
  return new ApiError({ kind: errorKindFor(response.status, code), status: response.status, code });
}

export interface InvestorsCsv {
  readonly fileName: string;
  readonly blob: Blob;
}

/** Rejects with an ApiError as fetchJson does; an answer that is not a CSV is bad_response. */
export async function fetchInvestorsCsv(search: string, now: () => Date = () => new Date()): Promise<InvestorsCsv> {
  const token = await bearerToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${CSV_PATH}${search}`, {
      headers: { Accept: "text/csv", Authorization: `Bearer ${token}` },
      // The Bearer token is the only credential (KP9): no cookies go with it.
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
    throw new ApiError({ kind: "network" });
  }
  if (!response.ok) throw await errorFrom(response);
  if (!CSV_TYPE.test(response.headers.get("Content-Type") ?? "")) {
    throw new ApiError({ kind: "bad_response", status: response.status });
  }
  const blob = await response.blob();
  return { fileName: csvFileName(response.headers.get("Content-Disposition"), now()), blob };
}

/** Fetches the table's view as CSV and hands it to the browser to save. */
export async function downloadInvestorsCsv(query: InvestorsQuery): Promise<void> {
  const { fileName, blob } = await fetchInvestorsCsv(csvSearch(query));
  saveBlob(fileName, blob);
}
