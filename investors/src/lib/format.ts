/** Sizes and dates as the portal shows them. */

const UNITS = ["B", "KB", "MB", "GB"] as const;
const STEP = 1024;

/** 1536 → "1.5 KB"; whole bytes stay whole ("512 B"). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  let value = bytes;
  let unit = 0;
  while (value >= STEP && unit < UNITS.length - 1) {
    value /= STEP;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value < 10 ? 1 : 0;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** An ISO timestamp → "27 Oct 2026" in the reader's time zone; "" when it is not a date. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE.format(date);
}
