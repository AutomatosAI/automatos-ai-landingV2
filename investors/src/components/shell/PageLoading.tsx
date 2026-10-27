import { Skeleton } from "@/components/ui/skeleton";
import { strings } from "@/strings";

/** Holds the page's shape while sign-in or the first answer loads. */
export function PageLoading() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16" aria-busy="true">
      <span className="sr-only">{strings.status.loading}</span>
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <Skeleton className="mt-6 h-px w-full" />
      <Skeleton className="mt-6 h-4 w-full max-w-prose" />
      <Skeleton className="mt-3 h-4 w-5/6 max-w-prose" />
    </section>
  );
}
