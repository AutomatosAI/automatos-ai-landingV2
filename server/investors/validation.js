/**
 * Request validation (KP15): zod at every boundary. A body that fails is
 * answered 400 {error:'invalid', fields:{<field>: <code>}}, one code per
 * field (the first issue found). Codes are stable identifiers, never words:
 * the app turns them into text (investors/src/strings.ts).
 */
import { z } from "zod";

/** The codes a field error carries. */
export const FIELD_CODES = Object.freeze({
  required: "required",
  tooLong: "too_long",
  invalidOption: "invalid_option",
  invalid: "invalid",
});

/** Control characters (a line break included): never in a one-line field. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** @param {unknown} value */
const isBlank = (value) => value === undefined || value === null || value === "";

/** @param {string} value */
export const isSingleLine = (value) => !CONTROL_CHARS.test(value);

/**
 * A required one-line string: trimmed, 1 to max characters.
 * @param {number} max
 */
export function requiredText(max) {
  return z
    .string({ errorMap: (_issue, ctx) => ({ message: isBlank(ctx.data) ? FIELD_CODES.required : FIELD_CODES.invalid }) })
    .trim()
    .min(1, FIELD_CODES.required)
    .max(max, FIELD_CODES.tooLong)
    .refine(isSingleLine, FIELD_CODES.invalid);
}

/**
 * An optional one-line string: trimmed, at most max characters; missing,
 * null or blank is null.
 * @param {number} max
 */
export function optionalText(max) {
  const text = z
    .string({ errorMap: () => ({ message: FIELD_CODES.invalid }) })
    .trim()
    .max(max, FIELD_CODES.tooLong)
    .refine(isSingleLine, FIELD_CODES.invalid);
  return z.preprocess((value) => value ?? "", text).transform((value) => (value === "" ? null : value));
}

/**
 * One of a fixed list (a CHECK constraint's values).
 * @param {readonly [string, ...string[]]} values
 */
export function requiredChoice(values) {
  return z.enum(/** @type {[string, ...string[]]} */ ([...values]), {
    errorMap: (_issue, ctx) => ({ message: isBlank(ctx.data) ? FIELD_CODES.required : FIELD_CODES.invalidOption }),
  });
}

/**
 * One of a fixed list, or null when missing, null or blank.
 * @param {readonly [string, ...string[]]} values
 */
export function optionalChoice(values) {
  const choice = z.enum(/** @type {[string, ...string[]]} */ ([...values]), {
    errorMap: () => ({ message: FIELD_CODES.invalidOption }),
  });
  return z.preprocess((value) => (isBlank(value) ? null : value), choice.nullable());
}

/** A boolean that must be sent. */
export function requiredBoolean() {
  return z.boolean({
    errorMap: (_issue, ctx) => ({ message: ctx.data === undefined ? FIELD_CODES.required : FIELD_CODES.invalid }),
  });
}

/**
 * The first issue's code for each top-level field.
 * @param {import("zod").ZodError} error
 * @returns {Readonly<Record<string, string>>}
 */
export function fieldErrors(error) {
  const entries = error.issues
    .filter((issue) => typeof issue.path[0] === "string")
    .map((issue) => [/** @type {string} */ (issue.path[0]), issue.message]);
  // Object.fromEntries keeps the last entry per key: reversed, the first issue wins.
  return Object.freeze(Object.fromEntries(entries.reverse()));
}

/**
 * @param {import("express").Response} res
 * @param {import("zod").ZodError} error
 */
export function sendInvalid(res, error) {
  return res.status(400).json({ error: "invalid", fields: fieldErrors(error) });
}
