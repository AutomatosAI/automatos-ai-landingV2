import { ApiError } from "@/api/errors";
import { textError } from "@/lib/text-checks";
import type { Option } from "@/profile/options";
import { strings } from "@/strings";

import { DOCUMENT_KINDS, type AdminDocument, type DocumentBody, type DocumentKind } from "./documents-api";

/**
 * The New / Edit document form as pure functions: its values, the server's
 * checks (admin-documents.js createSchema, DOCUMENT_LIMITS), and the words
 * for the server's field codes.
 */

export interface DocumentFormValues {
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly kind: DocumentKind | "";
  readonly alertOnFirstOpen: boolean;
}

export type DocumentField = keyof DocumentFormValues;

/** In the order the form shows them. */
export const DOCUMENT_FIELDS: readonly DocumentField[] = ["title", "description", "category", "kind", "alertOnFirstOpen"];

export type DocumentFieldErrors = Readonly<Partial<Record<DocumentField, string>>>;

export const DOCUMENT_LIMITS = { title: 160, description: 600, category: 60 } as const;

type TextField = keyof typeof DOCUMENT_LIMITS;

export const EMPTY_DOCUMENT_FORM: DocumentFormValues = Object.freeze({
  title: "",
  description: "",
  category: "",
  kind: "",
  alertOnFirstOpen: false,
});

export function formValuesOf(document: AdminDocument): DocumentFormValues {
  return {
    title: document.title,
    description: document.description ?? "",
    category: document.category,
    kind: document.kind,
    alertOnFirstOpen: document.alertOnFirstOpen,
  };
}

export const KIND_OPTIONS: readonly Option<DocumentKind>[] = Object.freeze(
  DOCUMENT_KINDS.map((value) => Object.freeze({ value, label: strings.admin.documents.kinds[value] })),
);

const isKind = (value: string): value is DocumentKind => (DOCUMENT_KINDS as readonly string[]).includes(value);

/** Every field's first problem; an empty object means the form can be sent. */
export function validateDocumentForm(values: DocumentFormValues): DocumentFieldErrors {
  const checks: readonly (readonly [DocumentField, string | null])[] = [
    ["title", textError(values.title, DOCUMENT_LIMITS.title, true)],
    ["description", textError(values.description, DOCUMENT_LIMITS.description, false)],
    ["category", textError(values.category, DOCUMENT_LIMITS.category, true)],
    ["kind", isKind(values.kind) ? null : "required"],
  ];
  return Object.fromEntries(checks.filter(([, code]) => code !== null));
}

/** The POST body (and the PATCH body of an edit). Call it only for values validateDocumentForm passed. */
export function toDocumentBody(values: DocumentFormValues): DocumentBody {
  if (!isKind(values.kind)) throw new TypeError("toDocumentBody: the form is not complete");
  const description = values.description.trim();
  return {
    title: values.title.trim(),
    description: description === "" ? null : description,
    category: values.category.trim(),
    kind: values.kind,
    alertOnFirstOpen: values.alertOnFirstOpen,
  };
}

const isTextField = (field: DocumentField): field is TextField => field in DOCUMENT_LIMITS;

/** The words under a field for an error code; an unknown code gets the general one. */
export function documentErrorMessage(field: DocumentField, code: string): string {
  const errors = strings.admin.form.errors;
  switch (code) {
    case "required":
      return errors.required;
    case "too_long":
      return isTextField(field) ? errors.tooLong(DOCUMENT_LIMITS[field]) : errors.invalid;
    case "invalid_option":
      return errors.invalidOption;
    default:
      return errors.invalid;
  }
}

const isDocumentField = (key: string): key is DocumentField => (DOCUMENT_FIELDS as readonly string[]).includes(key);

export interface DocumentSaveFailure {
  readonly fields: DocumentFieldErrors;
  readonly message: string;
}

/** What the dialog shows when the save fails: field errors under their fields, and one line above the buttons. */
export function documentSaveFailure(error: unknown): DocumentSaveFailure {
  const form = strings.admin.form;
  if (!(error instanceof ApiError)) return { fields: {}, message: form.failed };
  const entries = error.kind === "invalid" ? Object.entries(error.fields).filter(([key]) => isDocumentField(key)) : [];
  if (entries.length > 0) return { fields: Object.fromEntries(entries), message: form.checkFields };
  if (error.kind === "not_found") return { fields: {}, message: form.gone };
  if (error.kind === "unauthenticated") return { fields: {}, message: strings.status.signIn.body };
  return { fields: {}, message: form.failed };
}

/** The DOM id of a field's control, for its label and for focus. */
export const documentFieldId = (field: DocumentField) => `document-${field}`;

export function firstInvalidDocumentField(errors: DocumentFieldErrors): DocumentField | null {
  return DOCUMENT_FIELDS.find((field) => errors[field] !== undefined) ?? null;
}
