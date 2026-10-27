/**
 * The server's one-line text rule (server/investors/validation.js), so a form
 * can show most mistakes before a round trip: trimmed, at most max
 * characters, no control characters (a line break included).
 */

export type TextErrorCode = "required" | "too_long" | "invalid";

const hasControlChar = (value: string) => [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);

/** The value's first problem, or null when the server will take it. */
export function textError(value: string, max: number, required: boolean): TextErrorCode | null {
  const trimmed = value.trim();
  if (required && trimmed === "") return "required";
  if (trimmed.length > max) return "too_long";
  if (hasControlChar(trimmed)) return "invalid";
  return null;
}
