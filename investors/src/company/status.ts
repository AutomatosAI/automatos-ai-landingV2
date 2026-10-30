/**
 * The status register's four chip labels (DECK-PLAN §3.0), exactly as the
 * deck prints them. A product link carries one of them or none: a chip comes
 * only from the register's default column or appendix A12, never from here.
 */
export const STATUS_LABELS = ["LIVE", "IN BETA", "BUILDING NOW", "NEXT, WITH THIS FUNDING"] as const;

export type StatusLabel = (typeof STATUS_LABELS)[number];

export function isStatusLabel(value: unknown): value is StatusLabel {
  return typeof value === "string" && (STATUS_LABELS as readonly string[]).includes(value);
}
