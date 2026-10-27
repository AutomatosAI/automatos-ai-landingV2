import { ADMIN_DOCUMENTS_PATH } from "@/lib/paths";

/** A document's analytics page (US-015), relative to the app's basename like lib/paths.ts. */
export function adminDocumentStatsPath(id: string): string {
  return `${ADMIN_DOCUMENTS_PATH}/${encodeURIComponent(id)}/stats`;
}

/** The address keeps the version shown as ?version=N; the current version has none. */
export const VERSION_PARAM = "version";

/** The server's version column is an integer: no version is larger (queries/document-stats.js MAX_VERSION). */
export const MAX_VERSION = 2_147_483_647;

/** ?version from the address: a whole number 1..MAX_VERSION, else null (the current version). */
export function parseVersion(value: string | null): number | null {
  if (value === null || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const version = Number(value);
  return version <= MAX_VERSION ? version : null;
}

/** The search params for a version: none for the current one, so its address stays plain. */
export function versionSearch(version: number, current: number): Record<string, string> {
  return version === current ? {} : { [VERSION_PARAM]: String(version) };
}
