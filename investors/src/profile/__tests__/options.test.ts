import { describe, expect, it } from "vitest";

import { strings } from "@/strings";

import {
  CHEQUE_SIZES,
  CHEQUE_SIZE_OPTIONS,
  INVESTOR_TYPES,
  INVESTOR_TYPE_OPTIONS,
  SOURCES,
  SOURCE_OPTIONS,
  oneOfOrBlank,
} from "../options";

const LISTS = [
  ["investor types", INVESTOR_TYPES, INVESTOR_TYPE_OPTIONS, strings.profile.investorTypes],
  ["cheque sizes", CHEQUE_SIZES, CHEQUE_SIZE_OPTIONS, strings.profile.chequeSizes],
  ["sources", SOURCES, SOURCE_OPTIONS, strings.profile.sources],
] as const;

describe("the label maps", () => {
  it("are the server's CHECK lists, in order", () => {
    expect(INVESTOR_TYPES).toEqual(["vc", "angel", "family_office", "corporate", "accelerator", "other"]);
    expect(CHEQUE_SIZES).toEqual(["lt_50k", "50k_250k", "250k_1m", "gt_1m"]);
    expect(SOURCES).toEqual(["websummit", "intro", "website", "other"]);
  });

  it.each(LISTS)("label every one of the %s, and nothing else", (_name, values, _options, labels) => {
    expect(Object.keys(labels).sort()).toEqual([...values].sort());
  });

  it.each(LISTS)("give the %s readable, distinct labels, never the codes", (_name, values, options) => {
    expect(options.map((option) => option.value)).toEqual([...values]);
    const words = options.map((option) => option.label);
    expect(new Set(words).size).toBe(words.length);
    for (const option of options) {
      expect(option.label.trim()).not.toBe("");
      expect(option.label).not.toBe(option.value);
      expect(option.label).not.toContain("_");
    }
  });

  it("names the choices readably", () => {
    expect(INVESTOR_TYPE_OPTIONS.find((option) => option.value === "family_office")?.label).toBe("Family office");
    expect(SOURCE_OPTIONS.find((option) => option.value === "websummit")?.label).toBe("Web Summit");
    expect(CHEQUE_SIZE_OPTIONS.find((option) => option.value === "250k_1m")?.label).toBe("250k to 1M");
  });

  it("are frozen", () => {
    expect(Object.isFrozen(INVESTOR_TYPE_OPTIONS)).toBe(true);
    expect(Object.isFrozen(INVESTOR_TYPE_OPTIONS[0])).toBe(true);
  });
});

describe("oneOfOrBlank", () => {
  it("keeps a listed value and blanks anything else", () => {
    expect(oneOfOrBlank(SOURCES, "intro")).toBe("intro");
    expect(oneOfOrBlank(SOURCES, "")).toBe("");
    expect(oneOfOrBlank(SOURCES, "billboard")).toBe("");
  });
});
