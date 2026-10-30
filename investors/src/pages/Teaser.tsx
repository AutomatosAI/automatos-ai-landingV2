import { AuthButtons, useAuthState } from "@/auth";
import { MailLink } from "@/components/MailLink";
import { TrackingNotice } from "@/components/TrackingNotice";
import { Separator } from "@/components/ui/separator";
import { strings } from "@/strings";

import { teaserSignIn } from "./teaser-model";

const teaser = strings.teaser;

function SignInPanel() {
  const { status } = useAuthState();
  const panel = teaserSignIn(status);
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

/** Signed-out /investors: what the portal holds and how to get in (US-004). */
export function Teaser() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">{teaser.title}</h1>
      <p className="mt-4 max-w-prose text-lg text-foreground/80">{teaser.pitch}</p>
      <Separator className="my-8" />
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {teaser.insideHeading}
          </h2>
          <ul className="mt-4 divide-y border-y">
            {teaser.inside.map((item) => (
              <li key={item} className="py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {teaser.signInHeading}
          </h2>
          <div className="mt-4">
            <SignInPanel />
          </div>
          <TrackingNotice className="mt-8" />
        </div>
      </div>
    </section>
  );
}
