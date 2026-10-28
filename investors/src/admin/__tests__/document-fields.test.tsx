import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { strings } from "@/strings";

import { EMPTY_DOCUMENT_FORM, type DocumentFieldErrors } from "../document-form";
import { DocumentFields } from "../DocumentFields";

const fields = strings.admin.form.fields;
const HINT = strings.admin.documents.pitchHint;

function renderFields(errors: DocumentFieldErrors = {}) {
  const form = { values: EMPTY_DOCUMENT_FORM, errors, disabled: false, set: vi.fn(), categories: ["Pitch"] };
  return render(<DocumentFields form={form} />);
}

describe("the category field's pitch hint (W3-03)", () => {
  it("says what 'Pitch' does, in one line under the category field, read with it", () => {
    renderFields();
    expect(HINT).toBe("Category 'Pitch' puts a PDF and a video at the top of the investor home page.");
    const category = screen.getByLabelText(fields.category.label);
    const hint = screen.getByText(HINT);
    expect(category).toHaveAccessibleDescription(HINT);
    expect(category.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText(HINT)).toHaveLength(1);
  });

  it("is the only hint: the other fields describe nothing until they have an error", () => {
    renderFields();
    expect(screen.getByLabelText(fields.title.label)).not.toHaveAttribute("aria-describedby");
    expect(screen.getByLabelText(/^Description/)).not.toHaveAttribute("aria-describedby");
  });

  it("keeps the field's error read too, before the hint", () => {
    renderFields({ category: "required" });
    const category = screen.getByLabelText(fields.category.label);
    expect(category).toHaveAttribute("aria-invalid", "true");
    expect(category).toHaveAccessibleDescription(`${strings.admin.form.errors.required} ${HINT}`);
  });
});
