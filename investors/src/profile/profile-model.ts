import { ApiError } from "@/api/errors";
import type { Me, ProfileBody } from "@/api/me";
import { strings } from "@/strings";

import { CHEQUE_SIZES, INVESTOR_TYPES, SOURCES, oneOfOrBlank, type ChequeSize, type InvestorType, type Source } from "./options";

/**
 * The profile form as pure functions: its values, the same checks the
 * server makes (server/investors/routes/me.js) so most mistakes show before
 * a round trip, and the words for the server's field codes.
 */

export interface ProfileValues {
  readonly name: string;
  readonly firm: string;
  readonly title: string;
  readonly investorType: InvestorType | "";
  readonly chequeSize: ChequeSize | "";
  readonly linkedinUrl: string;
  readonly country: string;
  readonly source: Source | "";
  readonly marketingOptIn: boolean;
}

export type ProfileField = keyof ProfileValues;

/** In the order the form shows them. */
export const PROFILE_FIELDS: readonly ProfileField[] = [
  "name",
  "firm",
  "title",
  "investorType",
  "chequeSize",
  "linkedinUrl",
  "country",
  "source",
  "marketingOptIn",
];

/** Field → the server's error code (validation.js FIELD_CODES, plus linkedin_url). */
export type FieldErrors = Readonly<Partial<Record<ProfileField, string>>>;

export const PROFILE_LIMITS = { name: 120, firm: 160, title: 120, linkedinUrl: 300, country: 80 } as const;

type TextField = keyof typeof PROFILE_LIMITS;

/** The stored profile, or for a first visit the name from the sign-in account and nothing else. */
export function initialValues(me: Me): ProfileValues {
  const investor = me.investor;
  return {
    name: investor.name ?? "",
    firm: investor.firm ?? "",
    title: investor.title ?? "",
    investorType: investor.investorType ?? "",
    chequeSize: investor.chequeSize ?? "",
    linkedinUrl: investor.linkedinUrl ?? "",
    country: investor.country ?? "",
    source: investor.source ?? "",
    marketingOptIn: investor.marketingOptIn,
  };
}

const LINKEDIN_HOST = "linkedin.com";

/** https://, on linkedin.com or a subdomain, no credentials, no port: the server's rule. */
export function isLinkedInUrl(value: string): boolean {
  if (!/^https:\/\//i.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const host = url.hostname;
  const onLinkedIn = host === LINKEDIN_HOST || host.endsWith(`.${LINKEDIN_HOST}`);
  return url.protocol === "https:" && onLinkedIn && url.username === "" && url.password === "" && url.port === "";
}

const hasControlChar = (value: string) => [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);

function textError(value: string, max: number, required: boolean): string | null {
  const trimmed = value.trim();
  if (required && trimmed === "") return "required";
  if (trimmed.length > max) return "too_long";
  if (hasControlChar(trimmed)) return "invalid";
  return null;
}

function linkedinError(value: string): string | null {
  const error = textError(value, PROFILE_LIMITS.linkedinUrl, false);
  if (error !== null) return error;
  const trimmed = value.trim();
  return trimmed === "" || isLinkedInUrl(trimmed) ? null : "linkedin_url";
}

/** Every field's first problem; an empty object means the form can be sent. */
export function validateProfile(values: ProfileValues): FieldErrors {
  const checks: readonly (readonly [ProfileField, string | null])[] = [
    ["name", textError(values.name, PROFILE_LIMITS.name, true)],
    ["firm", textError(values.firm, PROFILE_LIMITS.firm, true)],
    ["title", textError(values.title, PROFILE_LIMITS.title, false)],
    ["investorType", oneOfOrBlank(INVESTOR_TYPES, values.investorType) === "" ? "required" : null],
    ["linkedinUrl", linkedinError(values.linkedinUrl)],
    ["country", textError(values.country, PROFILE_LIMITS.country, false)],
    ["source", oneOfOrBlank(SOURCES, values.source) === "" ? "required" : null],
  ];
  return Object.fromEntries(checks.filter(([, code]) => code !== null));
}

const blankToNull = (value: string) => (value.trim() === "" ? null : value.trim());

/** The PUT /me body. Call it only for values validateProfile passed. */
export function toProfileBody(values: ProfileValues): ProfileBody {
  if (values.investorType === "" || values.source === "") throw new TypeError("toProfileBody: the form is not complete");
  return {
    name: values.name.trim(),
    firm: values.firm.trim(),
    title: blankToNull(values.title),
    investorType: values.investorType,
    chequeSize: oneOfOrBlank(CHEQUE_SIZES, values.chequeSize) || null,
    linkedinUrl: blankToNull(values.linkedinUrl),
    country: blankToNull(values.country),
    source: values.source,
    marketingOptIn: values.marketingOptIn,
  };
}

const isTextField = (field: ProfileField): field is TextField => field in PROFILE_LIMITS;

/** The words under a field for an error code; an unknown code gets the general one. */
export function errorMessage(field: ProfileField, code: string): string {
  const errors = strings.profile.errors;
  switch (code) {
    case "required":
      return errors.required;
    case "too_long":
      return isTextField(field) ? errors.tooLong(PROFILE_LIMITS[field]) : errors.invalid;
    case "invalid_option":
      return errors.invalidOption;
    case "linkedin_url":
      return errors.linkedinUrl;
    default:
      return errors.invalid;
  }
}

const isProfileField = (key: string): key is ProfileField => (PROFILE_FIELDS as readonly string[]).includes(key);

/** The server's 400 fields, keeping only the form's own. */
export function serverFieldErrors(fields: Readonly<Record<string, string>>): FieldErrors {
  return Object.fromEntries(Object.entries(fields).filter(([key]) => isProfileField(key)));
}

export function firstInvalidField(errors: FieldErrors): ProfileField | null {
  return PROFILE_FIELDS.find((field) => errors[field] !== undefined) ?? null;
}

export interface SaveFailure {
  readonly fields: FieldErrors;
  readonly message: string;
}

/** What the form shows when PUT /me fails: field errors under their fields, and one line above the button. */
export function saveFailure(error: unknown): SaveFailure {
  const profile = strings.profile;
  if (!(error instanceof ApiError)) return { fields: {}, message: profile.failed };
  const fields = error.kind === "invalid" ? serverFieldErrors(error.fields) : {};
  if (Object.keys(fields).length > 0) return { fields, message: profile.checkFields };
  if (error.kind === "rate_limited") return { fields: {}, message: profile.rateLimited };
  if (error.kind === "unauthenticated") return { fields: {}, message: strings.status.signIn.body };
  return { fields: {}, message: profile.failed };
}

/** The DOM id of a field's control, for its label and for focus. */
export const fieldId = (field: ProfileField) => `profile-${field}`;

/** The errors without one field's: it goes as soon as the field is edited. */
export function clearFieldError(errors: FieldErrors, field: ProfileField): FieldErrors {
  return errors[field] === undefined ? errors : Object.fromEntries(Object.entries(errors).filter(([key]) => key !== field));
}
