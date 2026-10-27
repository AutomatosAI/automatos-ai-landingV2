import { z } from "zod";

/*
 * What the tracker sends to POST /api/investors/events (KP16). The client
 * sends only these three types; document_open and document_download are
 * written by the server when it issues a link. The PDF viewer feeds
 * page_view, the section pages section_view; video_progress waits for
 * wave 2's video player.
 */

/** The server clamps longer durations to this; the client never sends more. */
export const MAX_DURATION_MS = 600_000;

export type VideoPercent = 25 | 50 | 75 | 100;

export type TrackedEvent =
  | {
      readonly type: "page_view";
      readonly documentId: string;
      readonly documentVersion: number;
      readonly page: number;
      readonly durationMs: number;
    }
  | { readonly type: "section_view"; readonly section: string; readonly durationMs: number }
  | { readonly type: "video_progress"; readonly documentId: string; readonly percent: VideoPercent };

/** One POST /events body: at most MAX_BATCH events (queue.ts). */
export interface EventBatch {
  readonly sessionId?: string;
  readonly heartbeat?: true;
  readonly events: readonly TrackedEvent[];
}

/** POST /sessions answers the new visit's id. */
export const sessionSchema = z.object({ sessionId: z.string().uuid() });

const clampDuration = (ms: number) => Math.min(MAX_DURATION_MS, Math.max(0, Math.round(ms)));

/** A PDF page read for `ms` milliseconds (the viewer's onPageVisible). */
export function pageView(documentId: string, documentVersion: number, page: number, ms: number): TrackedEvent {
  return { type: "page_view", documentId, documentVersion, page, durationMs: clampDuration(ms) };
}

/** Visible time on a section page (US-009); `section` is its slug. */
export function sectionView(section: string, ms: number): TrackedEvent {
  return { type: "section_view", section, durationMs: clampDuration(ms) };
}

export function batchOf(events: readonly TrackedEvent[], sessionId: string | null, heartbeat: boolean): EventBatch {
  const withSession = sessionId === null ? { events } : { sessionId, events };
  return heartbeat && sessionId !== null ? { ...withSession, heartbeat: true } : withSession;
}
