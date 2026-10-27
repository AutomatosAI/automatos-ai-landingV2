import { ApiError } from "@/api/errors";
import { formatDate, formatDateTime } from "@/lib/format";
import type { ChequeSize, InvestorType, Source } from "@/profile/options";
import { strings } from "@/strings";

import type { AdminInvestor, DeckProgress } from "./investors-api";

/**
 * The words and numbers the investors table and an investor's page show,
 * as pure functions, so the components stay thin (KP15).
 */

const copy = strings.admin;
const profileLabels = strings.profile;

const SECOND_MS = 1000;
const MINUTE_S = 60;
const HOUR_S = 3600;

/**
 * Time spent: 200000 → "3 min 20 s"; a whole number of minutes drops the
 * seconds ("3 min"), an hour or more drops them too ("1 h 5 min").
 * Under a second is "< 1 s"; "" when it is not a duration.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms > 0 && ms < SECOND_MS) return "< 1 s";
  const seconds = Math.floor(ms / SECOND_MS);
  const hours = Math.floor(seconds / HOUR_S);
  const minutes = Math.floor((seconds % HOUR_S) / MINUTE_S);
  const rest = seconds % MINUTE_S;
  if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  if (minutes > 0) return rest > 0 ? `${minutes} min ${rest} s` : `${minutes} min`;
  return `${rest} s`;
}

/** How far into a document: "14/20"; just "14" when its page count is not known. */
export function pagesLabel(page: number, pageCount: number | null): string {
  return pageCount === null ? String(page) : `${page}/${pageCount}`;
}

/** The deck column: "14/20", or a dash when the investor opened no alert document. */
export function deckProgressLabel(progress: DeckProgress | null): string {
  return progress === null ? copy.investors.none : pagesLabel(progress.maxPage, progress.pageCount);
}

/** Who: the name, else the email (a Clerk account may have no name). */
export function investorName(investor: { readonly name: string | null; readonly email: string }): string {
  return investor.name ?? investor.email;
}

export function investorTypeLabel(type: InvestorType | null): string {
  return type === null ? copy.investors.none : profileLabels.investorTypes[type];
}

export function chequeSizeLabel(size: ChequeSize | null): string {
  return size === null ? copy.investors.none : profileLabels.chequeSizes[size];
}

export function sourceLabel(source: Source | null): string {
  return source === null ? copy.investors.none : profileLabels.sources[source];
}

/** Pages in a list of `total`: at least one, so an empty list still reads "Page 1 of 1". */
export function pageCountOf(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** "51–100 of 230": the rows a page shows; null when it shows none. */
export function pageRange(page: number, pageSize: number, shown: number, total: number): string | null {
  if (shown === 0) return null;
  const from = (page - 1) * pageSize + 1;
  return copy.pager.range(from, from + shown - 1, total);
}

/** Delete is confirmed by typing the investor's email; letter case and outer spaces do not count. */
export function deleteConfirmed(typed: string, email: string): boolean {
  const wanted = email.trim().toLowerCase();
  return wanted !== "" && typed.trim().toLowerCase() === wanted;
}

/** Under the block dialog's buttons when the server refused. */
export function blockFailureMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return copy.block.failed;
  if (error.code === "cannot_block_self") return copy.block.self;
  if (error.kind === "not_found") return copy.block.gone;
  if (error.kind === "unauthenticated") return strings.status.signIn.body;
  return copy.block.failed;
}

/** Under the delete dialog's buttons when the server refused. */
export function deleteFailureMessage(error: unknown): string {
  if (error instanceof ApiError && error.kind === "not_found") return copy.investor.delete.gone;
  if (error instanceof ApiError && error.kind === "unauthenticated") return strings.status.signIn.body;
  return copy.investor.delete.failed;
}

export interface ProfileFact {
  readonly label: string;
  readonly value: string;
  /** A LinkedIn address the server checked on save (https, linkedin.com). */
  readonly href?: string;
}

const LINKEDIN = /^https:\/\/([a-z0-9-]+\.)*linkedin\.com(\/|$)/i;

function linkedinFact(url: string | null): ProfileFact {
  const label = copy.investor.profile.linkedin;
  if (url === null) return { label, value: copy.investors.none };
  // The server only stores https linkedin.com addresses; anything else is shown, never linked.
  return LINKEDIN.test(url) ? { label, value: url, href: url } : { label, value: url };
}

function marketingText(investor: AdminInvestor): string {
  const words = copy.investor.profile;
  if (!investor.marketingOptIn) return words.marketingNo;
  return words.marketingYes(investor.marketingOptInAt ? formatDate(investor.marketingOptInAt) : "");
}

/** The profile card's rows, in reading order. */
export function profileFacts(investor: AdminInvestor): readonly ProfileFact[] {
  const words = copy.investor.profile;
  const text = (value: string | null) => value ?? copy.investors.none;
  return [
    { label: words.email, value: investor.email },
    { label: words.firm, value: text(investor.firm) },
    { label: words.jobTitle, value: text(investor.title) },
    { label: words.investorType, value: investorTypeLabel(investor.investorType) },
    { label: words.chequeSize, value: chequeSizeLabel(investor.chequeSize) },
    linkedinFact(investor.linkedinUrl),
    { label: words.country, value: text(investor.country) },
    { label: words.source, value: sourceLabel(investor.source) },
    { label: words.marketing, value: marketingText(investor) },
    { label: words.signedUp, value: formatDate(investor.createdAt) },
    { label: words.lastSeen, value: formatDateTime(investor.lastSeenAt) },
    {
      label: words.profileCompleted,
      value: investor.profileCompletedAt ? formatDate(investor.profileCompletedAt) : words.notYet,
    },
    { label: words.clerkUser, value: investor.clerkUserId },
  ];
}
