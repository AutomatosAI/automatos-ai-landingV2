import { MailLink } from "@/components/MailLink";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { strings } from "@/strings";

const SKELETON_CARDS = ["a", "b", "c", "d"] as const;

/** The cards' shape while the list loads. */
export function LibrarySkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">{strings.status.loading}</span>
      <Skeleton className="mb-4 h-3 w-24" />
      <ul className="grid gap-4 md:grid-cols-2">
        {SKELETON_CARDS.map((key) => (
          <li key={key} className="rounded-lg border p-5 sm:p-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-3 w-1/2" />
            <Skeleton className="mt-5 h-9 w-40" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Nothing is published yet. */
export function EmptyLibrary() {
  const empty = strings.library.empty;
  return (
    <div role="status" className="rounded-lg border px-5 py-10 text-center sm:px-6">
      <p className="font-serif text-2xl leading-tight">{empty.title}</p>
      <p className="mt-3 text-sm text-muted-foreground">
        {empty.before}
        <MailLink email={strings.contact.helloEmail} />
        {empty.after}
      </p>
    </div>
  );
}

/** Document storage is down: a note where the documents would be; the rest of the page still shows. */
export function DocumentsUnavailable({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div role="status" className="space-y-4 rounded-lg border px-5 py-10 text-center sm:px-6">
      <p className="text-muted-foreground">{strings.documents.unavailable}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {strings.status.error.retry}
      </Button>
    </div>
  );
}
