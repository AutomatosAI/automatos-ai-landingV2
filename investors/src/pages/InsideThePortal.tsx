import {
  ChartColumn,
  CircleHelp,
  FileText,
  Lock,
  Presentation,
  SquarePlay,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useId } from "react";

import { useAuthActions } from "@/auth";
import { FOCUS_RING } from "@/documents/PitchCard";
import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import type { TeaserSignIn } from "./teaser-model";

const teaser = strings.teaser;

type InsideItem = (typeof teaser.inside)[number];

/** Each card's glyph (the mock). Decorative: the card's title says what it is. */
const INSIDE_ICONS: Readonly<Record<InsideItem, LucideIcon>> = {
  "Pitch deck": Presentation,
  "One-pager": FileText,
  "Product demo": SquarePlay,
  "Business model": ChartColumn,
  Team: Users,
  FAQ: CircleHelp,
};

const GLYPH_STROKE = 1.75;

const CARD = "flex h-full w-full flex-col gap-4 rounded-md border border-border bg-background p-4 text-left";

const EYEBROW = "font-mono text-[11px] uppercase leading-tight tracking-[0.18em] text-muted-foreground";

interface CardBodyProps {
  readonly item: InsideItem;
  readonly titleId?: string;
  readonly ctaId?: string;
}

/** The glyph and the lock, the title, and "Sign in to open" at the card's foot. */
function CardBody({ item, titleId, ctaId }: CardBodyProps) {
  const Glyph = INSIDE_ICONS[item];
  return (
    <>
      <span aria-hidden="true" className="flex items-center justify-between text-muted-foreground">
        <Glyph aria-hidden="true" strokeWidth={GLYPH_STROKE} className="size-[18px]" />
        <Lock aria-hidden="true" strokeWidth={GLYPH_STROKE} className="size-4" />
      </span>
      <span id={titleId} className="font-serif text-xl leading-[1.15] tracking-[-0.005em] sm:text-[22px]">
        {item}
      </span>
      <span
        id={ctaId}
        className="mt-auto font-mono text-[10.5px] uppercase leading-[1.2] tracking-[0.14em] text-muted-foreground group-hover:text-foreground"
      >
        {strings.company.signInToOpen}
      </span>
    </>
  );
}

/**
 * A card that opens Clerk's sign-in, as the Sign in button does. Its name is
 * the title alone and "Sign in to open" its description, so "Sign in" names
 * one button on the page.
 */
function SignInCard({ item, disabled }: { readonly item: InsideItem; readonly disabled: boolean }) {
  const { openSignIn } = useAuthActions();
  const titleId = useId();
  const ctaId = useId();
  return (
    <button
      type="button"
      onClick={openSignIn}
      disabled={disabled}
      aria-labelledby={titleId}
      aria-describedby={ctaId}
      className={cn(
        CARD,
        "group transition-colors hover:border-foreground/30 disabled:pointer-events-none disabled:opacity-50",
        FOCUS_RING,
      )}
    >
      <CardBody item={item} titleId={titleId} ctaId={ctaId} />
    </button>
  );
}

/**
 * What the portal holds (PRD-003 §3.1 item 4): six locked cards, the hook.
 * While sign-in can be offered each card opens it (disabled while sign-in
 * loads); when sign-in is unavailable or the portal is off they are plain
 * cards, and the status line in Access above them says why.
 */
export function InsideThePortal({ panel }: { readonly panel: TeaserSignIn }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className={cn(EYEBROW, "mb-4")}>
        {teaser.insideHeading}
      </h2>
      <ul aria-labelledby={headingId} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {teaser.inside.map((item) => (
          <li key={item}>
            {panel.kind === "buttons" ? (
              <SignInCard item={item} disabled={panel.disabled} />
            ) : (
              <div className={CARD}>
                <CardBody item={item} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
