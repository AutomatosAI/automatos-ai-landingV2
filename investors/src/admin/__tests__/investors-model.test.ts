import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/errors";
import { strings } from "@/strings";
import { adminInvestor } from "@/test/fixtures";

import {
  blockFailureMessage,
  chequeSizeLabel,
  deckProgressLabel,
  deleteConfirmed,
  deleteFailureMessage,
  formatDuration,
  investorName,
  investorTypeLabel,
  pageCountOf,
  pageRange,
  pagesLabel,
  profileFacts,
  sourceLabel,
} from "../investors-model";

const admin = strings.admin;
const words = admin.investor.profile;

describe("formatDuration", () => {
  it.each([
    [200_000, "3 min 20 s"],
    [0, "0 s"],
    [999, "< 1 s"],
    [1_000, "1 s"],
    [59_999, "59 s"],
    [60_000, "1 min"],
    [61_500, "1 min 1 s"],
    [600_000, "10 min"],
    [3_599_000, "59 min 59 s"],
    [3_600_000, "1 h"],
    [3_900_000, "1 h 5 min"],
    [3_959_000, "1 h 5 min"],
    [90_000_000, "25 h"],
  ])("%d ms → %s", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });

  it("gives nothing for a duration that is not one", () => {
    expect(formatDuration(-1)).toBe("");
    expect(formatDuration(Number.NaN)).toBe("");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("");
  });
});

describe("the deck progress label", () => {
  it("reads furthest page of page count", () => {
    expect(deckProgressLabel({ documentId: "d", maxPage: 14, pageCount: 20 })).toBe("14/20");
    expect(pagesLabel(14, 20)).toBe("14/20");
  });

  it("shows 0 for a deck opened with no page recorded", () => {
    expect(deckProgressLabel({ documentId: "d", maxPage: 0, pageCount: 20 })).toBe("0/20");
  });

  it("shows the page alone when the page count is not known", () => {
    expect(deckProgressLabel({ documentId: "d", maxPage: 3, pageCount: null })).toBe("3");
  });

  it("shows a dash when the investor opened no alert document", () => {
    expect(deckProgressLabel(null)).toBe(admin.investors.none);
  });
});

describe("labels", () => {
  it("names the investor, else uses the email", () => {
    expect(investorName({ name: "Ada Example", email: "ada@example.com" })).toBe("Ada Example");
    expect(investorName({ name: null, email: "ada@example.com" })).toBe("ada@example.com");
  });

  it("words the profile's choices, and a dash for none", () => {
    expect(investorTypeLabel("family_office")).toBe(strings.profile.investorTypes.family_office);
    expect(chequeSizeLabel("gt_1m")).toBe(strings.profile.chequeSizes.gt_1m);
    expect(sourceLabel("websummit")).toBe(strings.profile.sources.websummit);
    expect([investorTypeLabel(null), chequeSizeLabel(null), sourceLabel(null)]).toEqual(Array(3).fill(admin.investors.none));
  });
});

describe("paging", () => {
  it("counts pages, with at least one", () => {
    expect(pageCountOf(0, 50)).toBe(1);
    expect(pageCountOf(50, 50)).toBe(1);
    expect(pageCountOf(51, 50)).toBe(2);
    expect(pageCountOf(230, 50)).toBe(5);
    expect(pageCountOf(10, 0)).toBe(1);
  });

  it("names the rows a page shows", () => {
    expect(pageRange(2, 50, 50, 230)).toBe(admin.pager.range(51, 100, 230));
    expect(pageRange(5, 50, 30, 230)).toBe(admin.pager.range(201, 230, 230));
    expect(pageRange(9, 50, 0, 230)).toBeNull();
  });
});

describe("deleteConfirmed", () => {
  it("wants the investor's email, ignoring letter case and outer spaces", () => {
    expect(deleteConfirmed("ada@example.com", "ada@example.com")).toBe(true);
    expect(deleteConfirmed("  ADA@Example.com ", "ada@example.com")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(deleteConfirmed("", "ada@example.com")).toBe(false);
    expect(deleteConfirmed("ada@example", "ada@example.com")).toBe(false);
    expect(deleteConfirmed("ada example", "ada@example.com")).toBe(false);
    expect(deleteConfirmed("", "")).toBe(false);
  });
});

describe("failure messages", () => {
  it("block: says so when the admin tries to block themselves or the investor is gone", () => {
    expect(blockFailureMessage(new ApiError({ kind: "server", status: 409, code: "cannot_block_self" }))).toBe(
      admin.block.self,
    );
    expect(blockFailureMessage(new ApiError({ kind: "not_found", status: 404, code: "not_found" }))).toBe(admin.block.gone);
    expect(blockFailureMessage(new ApiError({ kind: "unauthenticated", status: 401 }))).toBe(strings.status.signIn.body);
    expect(blockFailureMessage(new ApiError({ kind: "server", status: 500 }))).toBe(admin.block.failed);
    expect(blockFailureMessage(new Error("boom"))).toBe(admin.block.failed);
  });

  it("delete: says so when the investor was already deleted", () => {
    expect(deleteFailureMessage(new ApiError({ kind: "not_found", status: 404 }))).toBe(admin.investor.delete.gone);
    expect(deleteFailureMessage(new ApiError({ kind: "unauthenticated", status: 401 }))).toBe(strings.status.signIn.body);
    expect(deleteFailureMessage(new ApiError({ kind: "network" }))).toBe(admin.investor.delete.failed);
  });
});

describe("profileFacts", () => {
  const valueOf = (facts: ReturnType<typeof profileFacts>, label: string) => facts.find((fact) => fact.label === label);

  it("lists the profile in reading order", () => {
    const facts = profileFacts(adminInvestor());
    expect(facts.map((fact) => fact.label)).toEqual([
      words.email,
      words.firm,
      words.jobTitle,
      words.investorType,
      words.chequeSize,
      words.linkedin,
      words.country,
      words.source,
      words.marketing,
      words.signedUp,
      words.lastSeen,
      words.profileCompleted,
      words.clerkUser,
    ]);
    expect(valueOf(facts, words.investorType)?.value).toBe("Venture capital");
    expect(valueOf(facts, words.signedUp)?.value).toBe("20 Oct 2026");
    expect(valueOf(facts, words.clerkUser)?.value).toBe("user_ada");
  });

  it("links LinkedIn only for an https linkedin.com address", () => {
    expect(valueOf(profileFacts(adminInvestor()), words.linkedin)).toEqual({
      label: words.linkedin,
      value: "https://www.linkedin.com/in/ada-example",
      href: "https://www.linkedin.com/in/ada-example",
    });
    for (const url of ["javascript:alert(1)", "https://linkedin.com.example.com/in/x", "http://www.linkedin.com/in/x"]) {
      const fact = valueOf(profileFacts(adminInvestor({ linkedinUrl: url })), words.linkedin);
      expect(fact).toEqual({ label: words.linkedin, value: url });
    }
    expect(valueOf(profileFacts(adminInvestor({ linkedinUrl: null })), words.linkedin)?.value).toBe(admin.investors.none);
  });

  it("says whether they want updates, and since when", () => {
    expect(valueOf(profileFacts(adminInvestor()), words.marketing)?.value).toBe(words.marketingYes("20 Oct 2026"));
    const optedOut = adminInvestor({ marketingOptIn: false, marketingOptInAt: null });
    expect(valueOf(profileFacts(optedOut), words.marketing)?.value).toBe(words.marketingNo);
    expect(valueOf(profileFacts(adminInvestor({ marketingOptInAt: null })), words.marketing)?.value).toBe("Yes");
  });

  it("shows dashes for blanks and 'Not yet' before the profile is done", () => {
    const blank = adminInvestor({ firm: null, title: null, country: null, investorType: null, profileCompletedAt: null });
    const facts = profileFacts(blank);
    expect(valueOf(facts, words.firm)?.value).toBe(admin.investors.none);
    expect(valueOf(facts, words.jobTitle)?.value).toBe(admin.investors.none);
    expect(valueOf(facts, words.profileCompleted)?.value).toBe(words.notYet);
  });
});
