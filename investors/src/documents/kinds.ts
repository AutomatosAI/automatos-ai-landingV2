/** The kind CHECK list of 001_init.sql, in the order the admin form offers them. */
export const DOCUMENT_KINDS = ["pdf", "video", "spreadsheet", "slides", "doc", "other"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
