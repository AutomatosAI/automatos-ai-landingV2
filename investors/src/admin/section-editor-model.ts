import { ApiError } from "@/api/errors";
import { textError, type TextErrorCode } from "@/lib/text-checks";
import { strings } from "@/strings";

import type { AdminSection, SectionBody } from "./sections-api";

/**
 * The section editor as pure functions (US-016): the text the server holds,
 * the admin's draft, whether they differ (the unsaved-changes warning), the
 * server's checks (routes/sections.js SECTION_LIMITS, saveSchema), and the
 * words for each outcome.
 */

export type SectionDraft = SectionBody;

export interface EditorState {
  /** What the server holds, as its last answer gave it. */
  readonly saved: SectionDraft;
  /** What the admin sees in the form. */
  readonly draft: SectionDraft;
}

export type SectionField = "title" | "bodyMd";

export type SectionFieldErrors = Readonly<Partial<Record<SectionField, TextErrorCode>>>;

export const SECTION_LIMITS = { title: 80, bodyMd: 20_000 } as const;

/** A field's element id: the label, its error, and focus after a failed save find it by this. */
export const sectionFieldId = (field: SectionField | "published") => `section-${field}`;

/** In the order the form shows them. */
export const SECTION_FIELDS: readonly SectionField[] = ["title", "bodyMd"];

/** Tab, line feed and carriage return: the only control characters the server takes in markdown. */
const TEXT_CONTROLS: readonly number[] = [9, 10, 13];

const isNonTextChar = (char: string) => {
  const code = char.charCodeAt(0);
  return (code < 32 && !TEXT_CONTROLS.includes(code)) || code === 127;
};

export function draftOf(section: Pick<AdminSection, "title" | "bodyMd" | "published">): SectionDraft {
  return { title: section.title, bodyMd: section.bodyMd, published: section.published };
}

export function startEditing(section: AdminSection): EditorState {
  const saved = draftOf(section);
  return { saved, draft: saved };
}

/** The draft as the server would keep it: the title trimmed, the markdown exactly as typed. */
export function toSaveBody(draft: SectionDraft): SectionBody {
  return { title: draft.title.trim(), bodyMd: draft.bodyMd, published: draft.published };
}

function sameBody(a: SectionBody, b: SectionBody): boolean {
  return a.title === b.title && a.bodyMd === b.bodyMd && a.published === b.published;
}

/** Whether a save would change anything: a space added after the title does not count. */
export function isDirty({ saved, draft }: EditorState): boolean {
  return !sameBody(toSaveBody(draft), saved);
}

export function withChange(state: EditorState, change: Partial<SectionDraft>): EditorState {
  return { ...state, draft: { ...state.draft, ...change } };
}

/**
 * After a save: the server's answer is what it holds. The form takes the
 * answer too, unless the admin kept typing while the save was on its way;
 * then their newer text stays, and it is still unsaved.
 */
export function savedAs(state: EditorState, sent: SectionBody, answer: AdminSection): EditorState {
  const saved = draftOf(answer);
  const draft = sameBody(toSaveBody(state.draft), sent) ? saved : state.draft;
  return { saved, draft };
}

function markdownError(value: string): TextErrorCode | null {
  if (value.length > SECTION_LIMITS.bodyMd) return "too_long";
  if ([...value].some(isNonTextChar)) return "invalid";
  return null;
}

/** Every field's first problem; an empty object means the draft can be sent. */
export function validateDraft(draft: SectionDraft): SectionFieldErrors {
  const checks: readonly (readonly [SectionField, TextErrorCode | null])[] = [
    ["title", textError(draft.title, SECTION_LIMITS.title, true)],
    ["bodyMd", markdownError(draft.bodyMd)],
  ];
  return Object.fromEntries(checks.filter(([, code]) => code !== null));
}

const formErrors = strings.admin.form.errors;

/** The words under a field for one of the server's codes. */
export function sectionErrorMessage(field: SectionField, code: TextErrorCode): string {
  if (code === "required") return formErrors.required;
  if (code === "too_long") return formErrors.tooLong(SECTION_LIMITS[field]);
  return field === "title" ? formErrors.invalid : strings.admin.sections.errors.bodyInvalid;
}

const TEXT_CODES: readonly string[] = ["required", "too_long", "invalid"] satisfies readonly TextErrorCode[];
const isTextCode = (code: string): code is TextErrorCode => TEXT_CODES.includes(code);

/** The field errors in a 400 {error:'invalid', fields} for the fields this form shows. */
function serverFieldErrors(fields: Readonly<Record<string, string>>): SectionFieldErrors {
  return Object.fromEntries(
    SECTION_FIELDS.flatMap((field) => {
      const code = fields[field];
      return code !== undefined && isTextCode(code) ? [[field, code] as const] : [];
    }),
  );
}

/** The first field with an error, in form order, for focus; null when none. */
export function firstInvalidField(errors: SectionFieldErrors): SectionField | null {
  return SECTION_FIELDS.find((field) => errors[field] !== undefined) ?? null;
}

export interface SaveFailure {
  readonly message: string;
  readonly fields: SectionFieldErrors;
}

/** What a failed save says: the toast's line and any field errors the server named. */
export function saveFailure(error: unknown): SaveFailure {
  const failures = strings.admin.sections.failures;
  if (!(error instanceof ApiError)) return { message: failures.other, fields: {} };
  if (error.kind === "invalid") return { message: failures.fields, fields: serverFieldErrors(error.fields) };
  if (error.kind === "not_found") return { message: failures.gone, fields: {} };
  if (error.kind === "unauthenticated") return { message: failures.signIn, fields: {} };
  return { message: failures.other, fields: {} };
}
