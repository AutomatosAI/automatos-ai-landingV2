import { strings } from "@/strings";

/**
 * The profile's choice lists: the CHECK lists of the server's schema
 * (server/investors/routes/me.js), in the order the form shows them, each
 * with its readable label from strings.ts.
 */
export const INVESTOR_TYPES = ["vc", "angel", "family_office", "corporate", "accelerator", "other"] as const;
export const CHEQUE_SIZES = ["lt_50k", "50k_250k", "250k_1m", "gt_1m"] as const;
export const SOURCES = ["websummit", "intro", "website", "other"] as const;

export type InvestorType = (typeof INVESTOR_TYPES)[number];
export type ChequeSize = (typeof CHEQUE_SIZES)[number];
export type Source = (typeof SOURCES)[number];

export interface Option<T extends string> {
  readonly value: T;
  readonly label: string;
}

const labels = strings.profile;

function optionsOf<T extends string>(values: readonly T[], label: Readonly<Record<T, string>>): readonly Option<T>[] {
  return Object.freeze(values.map((value) => Object.freeze({ value, label: label[value] })));
}

export const INVESTOR_TYPE_OPTIONS = optionsOf(INVESTOR_TYPES, labels.investorTypes);
export const CHEQUE_SIZE_OPTIONS = optionsOf(CHEQUE_SIZES, labels.chequeSizes);
export const SOURCE_OPTIONS = optionsOf(SOURCES, labels.sources);

/** Narrows a select's value to one of the list, or "" (nothing chosen). */
export function oneOfOrBlank<T extends string>(values: readonly T[], value: string): T | "" {
  return (values as readonly string[]).includes(value) ? (value as T) : "";
}
