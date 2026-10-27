import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/errors";
import { strings } from "@/strings";
import { ADA_ME, NEW_ADA } from "@/test/fixtures";

import {
  clearFieldError,
  errorMessage,
  firstInvalidField,
  initialValues,
  isLinkedInUrl,
  saveFailure,
  serverFieldErrors,
  toProfileBody,
  validateProfile,
  type ProfileValues,
} from "../profile-model";

const VALID: ProfileValues = {
  name: "Ada Example",
  firm: "Example Ventures",
  title: "",
  investorType: "angel",
  chequeSize: "",
  linkedinUrl: "",
  country: "",
  source: "intro",
  marketingOptIn: false,
};

describe("initialValues", () => {
  it("prefills only the name for a first visit, with the opt-in unticked", () => {
    expect(initialValues(NEW_ADA)).toEqual({
      name: "Ada Example",
      firm: "",
      title: "",
      investorType: "",
      chequeSize: "",
      linkedinUrl: "",
      country: "",
      source: "",
      marketingOptIn: false,
    });
  });

  it("starts from the saved profile when editing", () => {
    expect(initialValues(ADA_ME)).toMatchObject({ firm: "Example Ventures", investorType: "vc", source: "websummit" });
  });

  it("leaves the name blank when the sign-in account has none", () => {
    expect(initialValues({ ...NEW_ADA, investor: { ...NEW_ADA.investor, name: null } }).name).toBe("");
  });
});

describe("validateProfile", () => {
  it("passes a complete form", () => {
    expect(validateProfile(VALID)).toEqual({});
  });

  it("needs name, firm, investor type and source", () => {
    expect(validateProfile({ ...VALID, name: "  ", firm: "", investorType: "", source: "" })).toEqual({
      name: "required",
      firm: "required",
      investorType: "required",
      source: "required",
    });
  });

  it.each([
    ["name", 120],
    ["firm", 160],
    ["title", 120],
    ["country", 80],
  ] as const)("limits %s to %i characters, after trimming", (field, max) => {
    expect(validateProfile({ ...VALID, [field]: ` ${"x".repeat(max)} ` })).toEqual({});
    expect(validateProfile({ ...VALID, [field]: "x".repeat(max + 1) })).toEqual({ [field]: "too_long" });
  });

  it("refuses a line break in a one-line field", () => {
    expect(validateProfile({ ...VALID, firm: "Example\nVentures" })).toEqual({ firm: "invalid" });
  });

  it("checks the LinkedIn address only when one is given", () => {
    expect(validateProfile({ ...VALID, linkedinUrl: "  " })).toEqual({});
    expect(validateProfile({ ...VALID, linkedinUrl: "https://www.linkedin.com/in/ada" })).toEqual({});
    expect(validateProfile({ ...VALID, linkedinUrl: "linkedin.com/in/ada" })).toEqual({ linkedinUrl: "linkedin_url" });
  });
});

describe("isLinkedInUrl: the server's rule", () => {
  it.each([
    "https://www.linkedin.com/in/ada-example",
    "https://linkedin.com/in/ada-example",
    "https://ie.linkedin.com/in/ada-example/",
  ])("accepts %s", (url) => {
    expect(isLinkedInUrl(url)).toBe(true);
  });

  it.each([
    "http://www.linkedin.com/in/ada",
    "https:www.linkedin.com/in/ada",
    "javascript:alert(1)",
    "https://linkedin.com.example.org/in/ada",
    "https://notlinkedin.com/in/ada",
    "https://www.linkedin.com@example.org/in/ada",
    "https://ada:secret@www.linkedin.com/in/ada",
    "https://www.linkedin.com:8443/in/ada",
  ])("refuses %s", (url) => {
    expect(isLinkedInUrl(url)).toBe(false);
  });
});

describe("toProfileBody", () => {
  it("trims text and sends blank optional fields as null", () => {
    expect(toProfileBody({ ...VALID, name: " Ada Example ", title: "  ", linkedinUrl: " https://www.linkedin.com/in/ada " })).toEqual({
      name: "Ada Example",
      firm: "Example Ventures",
      title: null,
      investorType: "angel",
      chequeSize: null,
      linkedinUrl: "https://www.linkedin.com/in/ada",
      country: null,
      source: "intro",
      marketingOptIn: false,
    });
  });

  it("keeps a chosen cheque size and the opt-in", () => {
    expect(toProfileBody({ ...VALID, chequeSize: "gt_1m", marketingOptIn: true })).toMatchObject({
      chequeSize: "gt_1m",
      marketingOptIn: true,
    });
  });

  it("refuses an incomplete form", () => {
    expect(() => toProfileBody({ ...VALID, source: "" })).toThrow(TypeError);
  });
});

describe("errorMessage", () => {
  const errors = strings.profile.errors;

  it("words each server code", () => {
    expect(errorMessage("firm", "required")).toBe(errors.required);
    expect(errorMessage("firm", "too_long")).toBe("Use 160 characters or fewer.");
    expect(errorMessage("source", "invalid_option")).toBe(errors.invalidOption);
    expect(errorMessage("linkedinUrl", "linkedin_url")).toBe(errors.linkedinUrl);
  });

  it("falls back to the general words for a code it does not know", () => {
    expect(errorMessage("name", "something_new")).toBe(errors.invalid);
    expect(errorMessage("marketingOptIn", "too_long")).toBe(errors.invalid);
  });
});

describe("server errors", () => {
  it("keeps only the form's own fields", () => {
    expect(serverFieldErrors({ linkedinUrl: "linkedin_url", email: "invalid", toString: "x" })).toEqual({
      linkedinUrl: "linkedin_url",
    });
  });

  it("puts a 400's fields under their fields", () => {
    const error = new ApiError({ kind: "invalid", status: 400, code: "invalid", fields: { linkedinUrl: "linkedin_url" } });
    expect(saveFailure(error)).toEqual({ fields: { linkedinUrl: "linkedin_url" }, message: strings.profile.checkFields });
  });

  it.each([
    [new ApiError({ kind: "rate_limited", status: 429 }), strings.profile.rateLimited],
    [new ApiError({ kind: "unauthenticated", status: 401 }), strings.status.signIn.body],
    [new ApiError({ kind: "invalid", status: 413 }), strings.profile.failed],
    [new ApiError({ kind: "server", status: 500 }), strings.profile.failed],
    [new Error("boom"), strings.profile.failed],
  ])("says what went wrong otherwise (%s)", (error, message) => {
    expect(saveFailure(error)).toEqual({ fields: {}, message });
  });

  it("finds the first invalid field in form order", () => {
    expect(firstInvalidField({ source: "required", firm: "required" })).toBe("firm");
    expect(firstInvalidField({})).toBeNull();
  });

  it("clears one field's error without touching the input", () => {
    const errors = Object.freeze({ firm: "required", source: "required" });
    expect(clearFieldError(errors, "firm")).toEqual({ source: "required" });
    expect(clearFieldError(errors, "name")).toBe(errors);
    expect(errors).toEqual({ firm: "required", source: "required" });
  });
});
