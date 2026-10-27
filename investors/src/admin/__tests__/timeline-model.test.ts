import { describe, expect, it } from "vitest";

import { strings } from "@/strings";
import { timelineEvent } from "@/test/fixtures";

import { eventDetails, timelineText } from "../timeline-model";

const fields = strings.admin.investor.timeline.fields;

describe("timelineText", () => {
  it("words the event as the overview does", () => {
    expect(timelineText(timelineEvent())).toBe("Read page 4 of Example deck");
    expect(timelineText(timelineEvent({ type: "document_download", page: null }))).toBe("Downloaded Example deck");
    expect(timelineText(timelineEvent({ type: "signed_in", documentId: null, documentTitle: null }))).toBe("Signed in");
  });

  it("names a deleted document", () => {
    expect(timelineText(timelineEvent({ type: "document_open", documentId: null, documentTitle: null }))).toBe(
      "Opened a deleted document",
    );
  });
});

describe("eventDetails", () => {
  it("lists every fact a page view carries, in order", () => {
    const details = eventDetails(timelineEvent());
    expect(details.map((detail) => detail.label)).toEqual([
      fields.time,
      fields.document,
      fields.version,
      fields.page,
      fields.duration,
      fields.session,
    ]);
    expect(details.slice(1).map((detail) => detail.value)).toEqual([
      "Example deck",
      "1",
      "4",
      "20 s",
      "00000000-0000-4000-8000-00000000005e",
    ]);
    expect(details[0]?.value).toMatch(/^27 Oct 2026, \d\d:\d\d:09$/);
  });

  it("leaves out what the event does not carry", () => {
    const signedIn = timelineEvent({
      type: "signed_in",
      sessionId: null,
      documentId: null,
      documentTitle: null,
      documentVersion: null,
      page: null,
      durationMs: null,
    });
    expect(eventDetails(signedIn).map((detail) => detail.label)).toEqual([fields.time]);
  });

  it("shows a section view's data and its time", () => {
    const section = timelineEvent({
      type: "section_view",
      documentId: null,
      documentTitle: null,
      documentVersion: null,
      page: null,
      durationMs: 65_000,
      data: { section: "team" },
    });
    const details = eventDetails(section);
    expect(details.find((detail) => detail.label === fields.duration)?.value).toBe("1 min 5 s");
    expect(details.find((detail) => detail.label === fields.data)?.value).toBe("section: team");
  });

  it("writes non-text data as JSON on one short line", () => {
    const video = timelineEvent({ type: "video_progress", page: null, durationMs: null, data: { percent: 50, extra: { a: 1 } } });
    expect(eventDetails(video).find((detail) => detail.label === fields.data)?.value).toBe('percent: 50, extra: {"a":1}');
    const long = timelineEvent({ data: { note: "x".repeat(300) } });
    const value = eventDetails(long).find((detail) => detail.label === fields.data)?.value ?? "";
    expect(value).toHaveLength("note: ".length + 120);
    expect(value.endsWith("…")).toBe(true);
  });

  it("names a document deleted since the event", () => {
    const orphan = timelineEvent({ documentTitle: null });
    expect(eventDetails(orphan).find((detail) => detail.label === fields.document)?.value).toBe(
      strings.admin.overview.latest.deletedDocument,
    );
  });

  it("leaves the event as it was", () => {
    const event = Object.freeze(timelineEvent({ data: Object.freeze({ percent: 25 }) }));
    expect(() => eventDetails(event)).not.toThrow();
  });
});
