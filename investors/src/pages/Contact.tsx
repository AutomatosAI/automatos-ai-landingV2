import { MailLink } from "@/components/MailLink";
import { SectionPage } from "@/sections/SectionPage";
import { strings } from "@/strings";

const line = strings.sections.contactLine;

/**
 * /investors/contact (US-009): the admins' markdown, where they put the
 * booking link, then a fixed line with the team's email, which shows even
 * before the section is published.
 */
export function Contact() {
  return (
    <SectionPage slug="contact">
      <p className="mt-8 max-w-prose text-foreground/85">
        {line.before}
        <MailLink email={strings.contact.helloEmail} />
        {line.after}
      </p>
    </SectionPage>
  );
}
