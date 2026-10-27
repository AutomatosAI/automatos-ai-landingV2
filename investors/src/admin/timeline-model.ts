import { formatFullDateTime } from "@/lib/format";
import { strings } from "@/strings";

import type { TimelineEvent } from "./investors-api";
import { formatDuration } from "./investors-model";
import { eventText } from "./overview-model";

/**
 * An investor's timeline (the reference AnalyticsManager's expandable rows):
 * each event in a line of words, and, opened, every fact it carries.
 */

const copy = strings.admin.investor.timeline;
const MAX_DATA_TEXT = 120;

export interface EventDetail {
  readonly label: string;
  readonly value: string;
}

/** The line a timeline row shows: "Read page 4 of Example deck". */
export function timelineText(event: TimelineEvent): string {
  return eventText(event);
}

/** A data value as one short line of text. */
function dataValue(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? String(value);
  return text.length > MAX_DATA_TEXT ? `${text.slice(0, MAX_DATA_TEXT - 1)}…` : text;
}

function dataText(data: TimelineEvent["data"]): string | null {
  if (data === null) return null;
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return entries.map(([key, value]) => `${key}: ${dataValue(value)}`).join(", ");
}

/** The facts of one event, in a fixed order, leaving out what it does not carry. */
export function eventDetails(event: TimelineEvent): readonly EventDetail[] {
  const fields = copy.fields;
  const documentTitle = event.documentId === null ? null : (event.documentTitle ?? strings.admin.overview.latest.deletedDocument);
  const candidates: readonly (readonly [string, string | null])[] = [
    [fields.time, formatFullDateTime(event.createdAt)],
    [fields.document, documentTitle],
    [fields.version, event.documentVersion === null ? null : String(event.documentVersion)],
    [fields.page, event.page === null ? null : String(event.page)],
    [fields.duration, event.durationMs === null ? null : formatDuration(event.durationMs)],
    [fields.session, event.sessionId],
    [fields.data, dataText(event.data)],
  ];
  return candidates.flatMap(([label, value]) => (value === null || value === "" ? [] : [{ label, value }]));
}
