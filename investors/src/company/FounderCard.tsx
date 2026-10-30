import { Calendar, Link as LinkGlyph, Mail, Phone, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LINK_REL, linkAttributes } from "@/sections/markdown-links";
import { strings } from "@/strings";

import { bookingHref, FOUNDER, type Founder } from "./company-data";
import { contactRowKind, founderRows, type ContactRow, type ContactRowKind } from "./contact-rows";
import { FounderAvatar } from "./FounderAvatar";

const copy = strings.company;

const ROW_GLYPHS: Readonly<Record<ContactRowKind, LucideIcon>> = {
  email: Mail,
  phone: Phone,
  web: LinkGlyph,
};

const ROLE = "font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground";

/** One contact row, the whole row a link (52 px tall): its icon, what it shows, and its label. */
function ContactRowLink({ row }: { readonly row: ContactRow }) {
  const Glyph = ROW_GLYPHS[contactRowKind(row.href)];
  return (
    <a
      href={row.href}
      {...linkAttributes(row.href, window.location.origin)}
      className="group flex min-h-[52px] items-center gap-3 py-2 text-left text-[15px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-secondary text-[color:var(--fg-2)]"
      >
        <Glyph aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere] group-hover:underline group-hover:underline-offset-4">
        {row.text}
      </span>
      <span className="whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {row.label}
      </span>
    </a>
  );
}

function ContactRows({ rows }: { readonly rows: readonly ContactRow[] }) {
  return (
    <ul className="divide-y divide-border border-t border-border">
      {rows.map((row, index) => (
        <li key={`${index}-${row.href}`}>
          <ContactRowLink row={row} />
        </li>
      ))}
    </ul>
  );
}

/** Book a call: the booking page with the portal's ref tag, always in a new tab. */
function BookCallButton({ address }: { readonly address: string }) {
  return (
    <Button asChild className="mt-2 w-full">
      <a href={bookingHref(address)} target="_blank" rel={LINK_REL}>
        <Calendar aria-hidden="true" />
        {copy.bookCall}
      </a>
    </Button>
  );
}

interface FounderCardProps {
  /** Home's header: the 64 px photo beside the name, no founder line, no card frame of its own. */
  readonly compact?: boolean;
  /** The founder; company-data.ts's public facts unless a test passes its own. */
  readonly founder?: Founder;
  /** Rows after the email row: on Home, the published founder_card section's rows (US-306). */
  readonly extraRows?: readonly ContactRow[];
  /**
   * The booking page's address as company-data.ts sets it (FOUNDER.bookingUrl).
   * Given, a Book a call button opens it with the portal's ref tag in a new
   * tab; left out or null, there is none (D8: the signed-out page passes it
   * only once the address is set; Home's Book a call is its tile).
   */
  readonly booking?: string | null;
  readonly className?: string;
}

/**
 * The founder and the person to contact (PRD-003 D1): the photo with our
 * ship badge, the name (h2), the role and, signed out, his line in quotation
 * marks; then the contact rows: the work email, any `extraRows`, LinkedIn
 * once set; then Book a call when `booking` is given. Never a phone number
 * from code: a phone row can only come from `extraRows`.
 */
export function FounderCard({ compact = false, founder = FOUNDER, extraRows, booking, className }: FounderCardProps) {
  const rows = founderRows(founder, extraRows);
  const bookingButton = booking ? <BookCallButton address={booking} /> : null;

  if (compact) {
    return (
      <div className={className}>
        <div className="mb-3.5 flex items-center gap-3.5">
          <FounderAvatar size="header" />
          <div className="min-w-0">
            <h2 className="font-serif text-2xl font-normal leading-[1.1] tracking-[-0.005em]">{founder.name}</h2>
            <p className={cn(ROLE, "mt-1 leading-[1.4]")}>{founder.role}</p>
          </div>
        </div>
        <ContactRows rows={rows} />
        {bookingButton}
      </div>
    );
  }

  return (
    <article
      className={cn("rounded-md border border-border bg-background px-5 pt-7 text-center", bookingButton ? "pb-5" : "pb-1.5", className)}
    >
      <FounderAvatar size="card" className="mx-auto" />
      <h2 className="mt-4 font-serif text-[32px] font-normal leading-[1.1] tracking-[-0.01em]">{founder.name}</h2>
      <p className={cn(ROLE, "mt-1 leading-[1.4]")}>{founder.role}</p>
      <p className="mx-auto mb-5 mt-4 max-w-[30ch] font-serif text-[19px] italic leading-[1.4] text-[color:var(--fg-2)]">
        {copy.quoted(founder.line)}
      </p>
      <ContactRows rows={rows} />
      {bookingButton}
    </article>
  );
}
