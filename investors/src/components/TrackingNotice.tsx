import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import { MailLink } from "./MailLink";

/** What the portal records and why (KP14): on the teaser and under the profile form. */
export function TrackingNotice({ className }: { className?: string }) {
  const notice = strings.trackingNotice;
  return (
    <p className={cn("max-w-prose text-sm leading-relaxed text-muted-foreground", className)}>
      {notice.before}
      <a href={notice.policyHref} className="underline underline-offset-4 hover:text-foreground">
        {notice.policyLink}
      </a>
      {notice.middle}
      <MailLink email={strings.contact.privacyEmail} />
      {notice.after}
    </p>
  );
}
