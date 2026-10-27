import type { ErrorScreen } from "@/api/errors";
import { useAuthActions } from "@/auth";
import { MailLink } from "@/components/MailLink";
import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

import { StatusPage } from "./StatusPage";

const status = strings.status;

export function UnavailablePage() {
  return (
    <StatusPage title={status.unavailable.title}>
      <p>{status.unavailable.body}</p>
      <p>
        {status.unavailable.contactBefore}
        <MailLink email={strings.contact.helloEmail} />
        {status.unavailable.contactAfter}
      </p>
    </StatusPage>
  );
}

function BlockedPage() {
  return (
    <StatusPage title={status.blocked.title}>
      <p>
        {status.blocked.before}
        <MailLink email={strings.contact.privacyEmail} />
        {status.blocked.after}
      </p>
    </StatusPage>
  );
}

function SignInAgainPage() {
  const { openSignIn } = useAuthActions();
  const action = (
    <Button type="button" onClick={openSignIn}>
      {strings.auth.signIn}
    </Button>
  );
  return (
    <StatusPage title={status.signIn.title} actions={action}>
      <p>{status.signIn.body}</p>
    </StatusPage>
  );
}

function MessagePage({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  const action = onRetry && (
    <Button type="button" variant="outline" onClick={onRetry}>
      {status.error.retry}
    </Button>
  );
  return (
    <StatusPage title={title} actions={action}>
      <p>{body}</p>
    </StatusPage>
  );
}

/** The screen for a failed API call (errors.ts screenForError). */
export function ApiErrorPage({ screen, onRetry }: { screen: ErrorScreen; onRetry?: () => void }) {
  switch (screen) {
    case "sign_in":
      return <SignInAgainPage />;
    case "blocked":
      return <BlockedPage />;
    case "unavailable":
      return <UnavailablePage />;
    case "email_required":
      return <MessagePage title={status.emailRequired.title} body={status.emailRequired.body} />;
    case "not_available":
    case "not_found":
      return <MessagePage title={status.notAvailable.title} body={status.notAvailable.body} />;
    case "error":
      return <MessagePage title={status.error.title} body={status.error.body} onRetry={onRetry} />;
  }
}
