import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/errors";
import { strings } from "@/strings";
import { adminDocument } from "@/test/fixtures";

import {
  EMPTY_DOCUMENT_FORM,
  KIND_OPTIONS,
  documentErrorMessage,
  documentSaveFailure,
  firstInvalidDocumentField,
  formValuesOf,
  toDocumentBody,
  validateDocumentForm,
  type DocumentFormValues,
} from "../document-form";
import { DOCUMENT_KINDS } from "../documents-api";

const VALID: DocumentFormValues = {
  title: "Example deck",
  description: "",
  category: "Pitch",
  kind: "pdf",
  alertOnFirstOpen: true,
};

const errors = strings.admin.form.errors;

describe("the document form's values", () => {
  it("starts empty with the alert off", () => {
    expect(EMPTY_DOCUMENT_FORM).toEqual({ title: "", description: "", category: "", kind: "", alertOnFirstOpen: false });
  });

  it("fills from a document for an edit", () => {
    const document = adminDocument({ description: null, kind: "slides", alertOnFirstOpen: true });
    expect(formValuesOf(document)).toEqual({
      title: "Example deck",
      description: "",
      category: "Pitch",
      kind: "slides",
      alertOnFirstOpen: true,
    });
  });

  it("offers every kind with a label", () => {
    expect(KIND_OPTIONS.map((option) => option.value)).toEqual([...DOCUMENT_KINDS]);
    expect(KIND_OPTIONS.every((option) => option.label.length > 0)).toBe(true);
  });
});

describe("validateDocumentForm", () => {
  it("passes a complete form", () => {
    expect(validateDocumentForm(VALID)).toEqual({});
  });

  it("requires a title, a category and a kind", () => {
    expect(validateDocumentForm({ ...VALID, title: "  ", category: "", kind: "" })).toEqual({
      title: "required",
      category: "required",
      kind: "required",
    });
  });

  it("holds the server's limits", () => {
    const found = validateDocumentForm({
      ...VALID,
      title: "t".repeat(161),
      description: "d".repeat(601),
      category: "c".repeat(61),
    });
    expect(found).toEqual({ title: "too_long", description: "too_long", category: "too_long" });
    expect(validateDocumentForm({ ...VALID, title: "t".repeat(160), description: "d".repeat(600), category: "c".repeat(60) })).toEqual({});
  });

  it("keeps the description to one line", () => {
    expect(validateDocumentForm({ ...VALID, description: "one\ntwo" })).toEqual({ description: "invalid" });
  });

  it("names the first invalid field in form order", () => {
    expect(firstInvalidDocumentField({ kind: "required", title: "required" })).toBe("title");
    expect(firstInvalidDocumentField({})).toBeNull();
  });
});

describe("toDocumentBody", () => {
  it("trims, and sends a blank description as null", () => {
    expect(toDocumentBody({ ...VALID, title: "  Example deck ", category: " Pitch ", description: "   " })).toEqual({
      title: "Example deck",
      description: null,
      category: "Pitch",
      kind: "pdf",
      alertOnFirstOpen: true,
    });
  });

  it("refuses a form without a kind", () => {
    expect(() => toDocumentBody({ ...VALID, kind: "" })).toThrow(TypeError);
  });
});

describe("documentErrorMessage and documentSaveFailure", () => {
  it("words each code", () => {
    expect(documentErrorMessage("title", "required")).toBe(errors.required);
    expect(documentErrorMessage("title", "too_long")).toBe(errors.tooLong(160));
    expect(documentErrorMessage("category", "too_long")).toBe(errors.tooLong(60));
    expect(documentErrorMessage("kind", "invalid_option")).toBe(errors.invalidOption);
    expect(documentErrorMessage("kind", "too_long")).toBe(errors.invalid);
    expect(documentErrorMessage("title", "something_new")).toBe(errors.invalid);
  });

  it("puts the server's field errors under the form's own fields", () => {
    const error = new ApiError({ kind: "invalid", status: 400, code: "invalid", fields: { title: "too_long", sortOrder: "invalid" } });
    expect(documentSaveFailure(error)).toEqual({ fields: { title: "too_long" }, message: strings.admin.form.checkFields });
  });

  it("says when the document is gone, when the session ended, and otherwise that it failed", () => {
    const form = strings.admin.form;
    expect(documentSaveFailure(new ApiError({ kind: "not_found", status: 404 })).message).toBe(form.gone);
    expect(documentSaveFailure(new ApiError({ kind: "unauthenticated", status: 401 })).message).toBe(
      strings.status.signIn.body,
    );
    expect(documentSaveFailure(new ApiError({ kind: "server", status: 500 })).message).toBe(form.failed);
    expect(documentSaveFailure(new Error("boom"))).toEqual({ fields: {}, message: form.failed });
  });
});
