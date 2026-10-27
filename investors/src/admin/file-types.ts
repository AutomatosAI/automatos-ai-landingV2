/**
 * The files an admin may upload (KP11, server/investors/s3.js): six types,
 * at most 250 MB. The server checks again when it signs the upload and at
 * finalize; checking here first saves a round trip and names the problem.
 */

export const PDF_TYPE = "application/pdf";
export const MAX_UPLOAD_BYTES = 262_144_000;

/** Extension → the content type the upload is signed with. */
const TYPE_BY_EXTENSION: ReadonlyMap<string, string> = new Map([
  [".pdf", PDF_TYPE],
  [".mp4", "video/mp4"],
  [".csv", "text/csv"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  [".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
]);

export const ALLOWED_CONTENT_TYPES: readonly string[] = Object.freeze([...TYPE_BY_EXTENSION.values()]);

/** The file picker's accept attribute: the extensions and the types. */
export const UPLOAD_ACCEPT = [...TYPE_BY_EXTENSION.keys(), ...TYPE_BY_EXTENSION.values()].join(",");

export type FileRejection = "content_type_not_allowed" | "invalid_size" | "file_too_large";

export type FileCheck =
  | { readonly ok: true; readonly contentType: string }
  | { readonly ok: false; readonly reason: FileRejection };

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
};

/**
 * The browser's type when it is one of the six; otherwise the extension's
 * (Windows reports a .csv as application/vnd.ms-excel, and some browsers
 * report nothing). Null when neither is allowed.
 */
export function contentTypeFor(file: { readonly name: string; readonly type: string }): string | null {
  if (ALLOWED_CONTENT_TYPES.includes(file.type)) return file.type;
  return TYPE_BY_EXTENSION.get(extensionOf(file.name)) ?? null;
}

/** Whether a picked file can be uploaded, and the content type to sign it with. */
export function checkFile(file: { readonly name: string; readonly type: string; readonly size: number }): FileCheck {
  const contentType = contentTypeFor(file);
  if (contentType === null) return { ok: false, reason: "content_type_not_allowed" };
  if (!Number.isSafeInteger(file.size) || file.size < 1) return { ok: false, reason: "invalid_size" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "file_too_large" };
  return { ok: true, contentType };
}
