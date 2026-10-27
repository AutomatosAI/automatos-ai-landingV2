import { z } from "zod";

import { fetchJson } from "@/api/client";
import { linkUrl } from "@/api/link-url";
import { DOCUMENT_KINDS, type DocumentKind } from "@/documents/kinds";

/**
 * The admin documents API (server/investors/routes/admin-documents.js,
 * US-014). Every answer is parsed (KP15). The server checks the admin
 * allowlist on every call (KP3); the app hiding the pages is only manners.
 */

// The kinds live with the library (documents/kinds.ts); the admin modules import them from here.
export { DOCUMENT_KINDS, type DocumentKind };

export const adminDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  kind: z.enum(DOCUMENT_KINDS),
  fileName: z.string().nullable(),
  contentType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  pageCount: z.number().int().nullable(),
  version: z.number().int(),
  sortOrder: z.number().int(),
  published: z.boolean(),
  alertOnFirstOpen: z.boolean(),
  hasFile: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AdminDocument = z.infer<typeof adminDocumentSchema>;

const listSchema = z.object({ documents: z.array(adminDocumentSchema) });
const oneSchema = z.object({ document: adminDocumentSchema });
const uploadTargetSchema = z.object({ url: linkUrl, key: z.string().min(1), headers: z.record(z.string()) });
const previewSchema = z.object({ url: linkUrl });

export type UploadTarget = z.infer<typeof uploadTargetSchema>;

/** POST /admin/documents: a new document's metadata (it goes to the end of the list). */
export interface DocumentBody {
  readonly title: string;
  readonly description: string | null;
  readonly category: string;
  readonly kind: DocumentKind;
  readonly alertOnFirstOpen: boolean;
}

/** PATCH /admin/documents/:id: any of the editable fields. */
export type DocumentPatch = Partial<DocumentBody & { readonly sortOrder: number; readonly published: boolean }>;

export interface UploadUrlBody {
  readonly fileName: string;
  readonly contentType: string;
  readonly contentLength: number;
  readonly pageCount: number | null;
}

export interface FinalizeBody {
  readonly key: string;
  readonly pageCount: number | null;
}

const documentPath = (id: string) => `/admin/documents/${encodeURIComponent(id)}`;

export async function fetchAdminDocuments(signal?: AbortSignal): Promise<readonly AdminDocument[]> {
  const answer = await fetchJson("/admin/documents", { schema: listSchema, signal });
  return answer.documents;
}

export async function createDocument(body: DocumentBody): Promise<AdminDocument> {
  const answer = await fetchJson("/admin/documents", { method: "POST", body, schema: oneSchema });
  return answer.document;
}

export async function editDocument(id: string, patch: DocumentPatch): Promise<AdminDocument> {
  const answer = await fetchJson(documentPath(id), { method: "PATCH", body: patch, schema: oneSchema });
  return answer.document;
}

/** 204: no body. */
export async function deleteDocument(id: string): Promise<void> {
  await fetchJson(documentPath(id), { method: "DELETE", schema: z.null() });
}

/** A presigned PUT for the document's next file version (15 minutes). */
export function requestUploadUrl(id: string, body: UploadUrlBody, signal?: AbortSignal): Promise<UploadTarget> {
  return fetchJson(`${documentPath(id)}/upload-url`, { method: "POST", body, schema: uploadTargetSchema, signal });
}

/** The server HEADs the uploaded object, checks it and records it as the current file. */
export async function finalizeUpload(id: string, body: FinalizeBody, signal?: AbortSignal): Promise<AdminDocument> {
  const answer = await fetchJson(`${documentPath(id)}/finalize`, { method: "POST", body, schema: oneSchema, signal });
  return answer.document;
}

/** A presigned GET (5 minutes, inline) for any document with a file, published or not. */
export async function requestPreviewLink(id: string): Promise<string> {
  const answer = await fetchJson(`${documentPath(id)}/preview-link`, { method: "POST", schema: previewSchema });
  return answer.url;
}
