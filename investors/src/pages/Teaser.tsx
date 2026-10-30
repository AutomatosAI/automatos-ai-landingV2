import { useId } from "react";

import { AuthButtons, useAuthState } from "@/auth";
import { CompanyCard } from "@/company/CompanyCard";
import { FOUNDER } from "@/company/company-data";
import { FounderCard } from "@/company/FounderCard";
import { ProductLinks } from "@/company/ProductLinks";
import { TeamList } from "@/company/TeamList";
import { MailLink } from "@/components/MailLink";
import { TrackingNotice } from "@/components/TrackingNotice";
import { Separator } from "@/components/ui/separator";
import { strings } from "@/strings";

import { InsideThePortal } from "./InsideThePortal";
import { teaserSignIn, type TeaserSignIn } from "./teaser-model";

const teaser = strings.teaser;

const EYEBROW = "font-mono text-[11px] uppercase leading-tight tracking-[0.18em] text-muted-foreground";

function SignInPanel({ panel }: { readonly panel: TeaserSignIn }) {
  if (panel.kind === "buttons") return <AuthButtons disabled={panel.disabled} />;
  if (panel.kind === "signin_unavailable") {
    return (
      <p role="status">
        {strings.auth.signInUnavailable.before}
        <MailLink email={strings.contact.helloEmail} />
        {strings.auth.signInUnavailable.after}
      </p>
    );
  }
  return (
    <p role="status">
      {strings.status.unavailable.body} {strings.status.unavailable.contactBefore}
      <MailLink email={strings.contact.helloEmail} />
      {strings.status.unavailable.contactAfter}
    </p>
  );
}

/**
 * The one primary action (PRD-003 D2): Create an account to read the deck,
 * with Sign in beside it, or the status line when sign-in can't be offered;
 * the tracking notice directly under them (KP14).
 */
function Access({ panel }: { readonly panel: TeaserSignIn }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-md border border-border bg-secondary p-5 sm:p-6">
      <h2 id={headingId} className={`${EYEBROW} mb-4`}>
        {teaser.signInHeading}
      </h2>
      <SignInPanel panel={panel} />
      <TrackingNotice className="mt-5" />
    </section>
  );
}

/**
 * Signed-out /investors (PRD-003 §3.1): the company first, then the one
 * primary action, what the portal holds, the founder and the team, and the
 * products to try. Every word comes from code, never from a section: this
 * page reads nothing from the API, so nothing an admin typed (a phone
 * number, say) can show here. No Book a call while its address is null (D8).
 */
export function Teaser() {
  const { status } = useAuthState();
  const panel = teaserSignIn(status);
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 pt-9 sm:px-6 sm:pb-[88px] sm:pt-14">
      <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">{teaser.title}</h1>
      <Separator className="my-6 sm:my-8" />
      <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_352px] lg:items-start lg:gap-x-10">
        <div className="grid gap-9 sm:gap-10">
          <CompanyCard />
          <Access panel={panel} />
          <InsideThePortal panel={panel} />
        </div>
        <div className="lg:sticky lg:top-20">
          <FounderCard booking={FOUNDER.bookingUrl} />
          <TeamList variant="list" className="mt-5" />
        </div>
      </div>
      <div className="mt-10 border-t border-border pt-8 sm:mt-14 sm:pt-10">
        <ProductLinks />
      </div>
    </section>
  );
}
