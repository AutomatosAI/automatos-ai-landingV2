import { describe, expect, it } from "vitest";

import { formatBytes, formatDate, formatDateTime, formatDay, formatFullDateTime } from "../format";

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1023, "1023 B"],
    [1024, "1.0 KB"],
    [1536, "1.5 KB"],
    [20_480, "20 KB"],
    [1_572_864, "1.5 MB"],
    [262_144_000, "250 MB"],
    [5 * 1024 ** 3, "5.0 GB"],
    [5 * 1024 ** 4, "5120 GB"],
  ])("%d bytes → %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });

  it("gives nothing for a size that is not one", () => {
    expect(formatBytes(-1)).toBe("");
    expect(formatBytes(Number.NaN)).toBe("");
  });
});

describe("formatDate", () => {
  it("shows day, short month and year", () => {
    // Midday UTC: the same calendar day in every time zone from UTC-11 to UTC+11.
    expect(formatDate("2026-10-27T12:00:00.000Z")).toBe("27 Oct 2026");
  });

  it("gives nothing for a string that is not a date", () => {
    expect(formatDate("not a date")).toBe("");
  });
});

describe("formatDateTime", () => {
  it("shows day, short month and a 24-hour time", () => {
    // Midday UTC: 27 Oct in every time zone from UTC-11 to UTC+11; the hour is the reader's.
    expect(formatDateTime("2026-10-27T12:00:00.000Z")).toMatch(/^27 Oct, ([01]\d|2[0-3]):[0-5]\d$/);
  });

  it("gives nothing for a string that is not a date", () => {
    expect(formatDateTime("not a date")).toBe("");
  });
});

describe("formatFullDateTime", () => {
  it("shows the date with its year and a 24-hour time to the second", () => {
    expect(formatFullDateTime("2026-10-27T12:00:09.000Z")).toMatch(/^27 Oct 2026, ([01]\d|2[0-3]):[0-5]\d:09$/);
  });

  it("gives nothing for a string that is not a date", () => {
    expect(formatFullDateTime("not a date")).toBe("");
  });
});

describe("formatDay", () => {
  it("names a UTC calendar day whatever the reader's time zone", () => {
    expect(formatDay("2026-10-27")).toBe("27 Oct");
    expect(formatDay("2026-11-01")).toBe("1 Nov");
  });

  it("gives nothing for anything but a YYYY-MM-DD day", () => {
    expect(formatDay("2026-10-27T00:00:00Z")).toBe("");
    expect(formatDay("2026-13-45")).toBe("");
    expect(formatDay("")).toBe("");
  });
});
