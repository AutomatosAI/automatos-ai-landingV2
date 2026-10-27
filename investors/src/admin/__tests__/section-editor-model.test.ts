import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/errors";
import { strings } from "@/strings";

import {
  SECTION_LIMITS,
  draftOf,
  firstInvalidField,
  isDirty,
  saveFailure,
  savedAs,
  sectionErrorMessage,
  startEditing,
  toSaveBody,
  validateDraft,
  withChange,
} from "../section-editor-model";
import { adminSection } from "./section-fixtures";

const TEAM = adminSection("team", { title: "Team", bodyMd: "We are three.", published: false });
const failures = strings.admin.sections.failures;

describe("the dirty-state model", () => {
  it("starts clean, with the draft equal to what the server holds", () => {
    const state = startEditing(TEAM);
    expect(state.draft).toEqual({ title: "Team", bodyMd: "We are three.", published: false });
    expect(state.saved).toEqual(state.draft);
    expect(isDirty(state)).toBe(false);
  });

  it("is dirty once any field differs: the title, the text or the published switch", () => {
    const state = startEditing(TEAM);
    expect(isDirty(withChange(state, { title: "The team" }))).toBe(true);
    expect(isDirty(withChange(state, { bodyMd: "We are four." }))).toBe(true);
    expect(isDirty(withChange(state, { published: true }))).toBe(true);
  });

  it("is clean again when the change is undone", () => {
    const state = startEditing(TEAM);
    const undone = withChange(withChange(state, { bodyMd: "We are four." }), { bodyMd: "We are three." });
    expect(isDirty(undone)).toBe(false);
  });

  it("does not count spaces around the title (the server trims it), but does count them in the text", () => {
    const state = startEditing(TEAM);
    expect(isDirty(withChange(state, { title: "  Team " }))).toBe(false);
    expect(isDirty(withChange(state, { bodyMd: "We are three. " }))).toBe(true);
  });

  it("never changes the state it is given", () => {
    const state = Object.freeze(startEditing(TEAM));
    const next = withChange(state, { title: "The team" });
    expect(next).not.toBe(state);
    expect(state.draft.title).toBe("Team");
  });

  it("sends the title trimmed and the text exactly as typed", () => {
    expect(toSaveBody({ title: "  Team  ", bodyMd: "  - one\n", published: true })).toEqual({
      title: "Team",
      bodyMd: "  - one\n",
      published: true,
    });
  });

  it("after a save, takes the server's answer as both the saved text and the form", () => {
    const edited = withChange(startEditing(TEAM), { title: " The team ", published: true });
    const sent = toSaveBody(edited.draft);
    const answer = adminSection("team", { title: "The team", bodyMd: "We are three.", published: true });
    const next = savedAs(edited, sent, answer);
    expect(next.saved).toEqual(draftOf(answer));
    expect(next.draft).toEqual(draftOf(answer));
    expect(isDirty(next)).toBe(false);
  });

  it("after a save, keeps text typed while it was on its way, still unsaved", () => {
    const edited = withChange(startEditing(TEAM), { bodyMd: "We are four." });
    const sent = toSaveBody(edited.draft);
    const typedOn = withChange(edited, { bodyMd: "We are four, soon five." });
    const next = savedAs(typedOn, sent, adminSection("team", { bodyMd: "We are four.", published: false }));
    expect(next.saved.bodyMd).toBe("We are four.");
    expect(next.draft.bodyMd).toBe("We are four, soon five.");
    expect(isDirty(next)).toBe(true);
  });
});

describe("validateDraft", () => {
  const draft = draftOf(TEAM);

  it("passes a draft the server takes, an empty text included", () => {
    expect(validateDraft(draft)).toEqual({});
    expect(validateDraft({ ...draft, bodyMd: "" })).toEqual({});
    expect(validateDraft({ ...draft, bodyMd: "a\tb\r\nc" })).toEqual({});
  });

  it("needs a one-line title of at most 80 characters", () => {
    expect(validateDraft({ ...draft, title: "   " })).toEqual({ title: "required" });
    expect(validateDraft({ ...draft, title: "x".repeat(SECTION_LIMITS.title + 1) })).toEqual({ title: "too_long" });
    expect(validateDraft({ ...draft, title: "x".repeat(SECTION_LIMITS.title) })).toEqual({});
    expect(validateDraft({ ...draft, title: "Team\u0007" })).toEqual({ title: "invalid" });
  });

  it("takes at most 20000 characters of text, without other control characters", () => {
    expect(validateDraft({ ...draft, bodyMd: "x".repeat(SECTION_LIMITS.bodyMd) })).toEqual({});
    expect(validateDraft({ ...draft, bodyMd: "x".repeat(SECTION_LIMITS.bodyMd + 1) })).toEqual({ bodyMd: "too_long" });
    expect(validateDraft({ ...draft, bodyMd: "one\u0000two" })).toEqual({ bodyMd: "invalid" });
    expect(validateDraft({ ...draft, bodyMd: "one\u007ftwo" })).toEqual({ bodyMd: "invalid" });
  });

  it("names the first field with an error, in form order", () => {
    expect(firstInvalidField({ bodyMd: "too_long", title: "required" })).toBe("title");
    expect(firstInvalidField({ bodyMd: "invalid" })).toBe("bodyMd");
    expect(firstInvalidField({})).toBeNull();
  });

  it("words each code for its field", () => {
    expect(sectionErrorMessage("title", "too_long")).toBe(strings.admin.form.errors.tooLong(80));
    expect(sectionErrorMessage("bodyMd", "too_long")).toBe(strings.admin.form.errors.tooLong(20000));
    expect(sectionErrorMessage("bodyMd", "invalid")).toBe(strings.admin.sections.errors.bodyInvalid);
  });
});

describe("saveFailure", () => {
  it("passes on the server's field codes for the fields the form shows", () => {
    const error = new ApiError({ kind: "invalid", status: 400, code: "invalid", fields: { title: "too_long", other: "x" } });
    expect(saveFailure(error)).toEqual({ message: failures.fields, fields: { title: "too_long" } });
  });

  it("drops a code the form has no words for", () => {
    const error = new ApiError({ kind: "invalid", status: 400, code: "invalid", fields: { bodyMd: "strange" } });
    expect(saveFailure(error).fields).toEqual({});
  });

  it("says plainly when the section is gone, the session ended, or anything else", () => {
    expect(saveFailure(new ApiError({ kind: "not_found", status: 404 })).message).toBe(failures.gone);
    expect(saveFailure(new ApiError({ kind: "unauthenticated", status: 401 })).message).toBe(failures.signIn);
    expect(saveFailure(new ApiError({ kind: "network" })).message).toBe(failures.other);
    expect(saveFailure(new Error("boom")).message).toBe(failures.other);
  });
});
