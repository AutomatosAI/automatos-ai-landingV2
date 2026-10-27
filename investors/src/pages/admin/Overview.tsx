import { ActivityChart } from "@/admin/ActivityChart";
import { KpiCards } from "@/admin/KpiCards";
import { LatestEvents } from "@/admin/LatestEvents";
import { LoadFailed } from "@/admin/LoadFailed";
import type { Overview } from "@/admin/overview-api";
import { kpiCards } from "@/admin/overview-model";
import { useAdminOverview } from "@/admin/use-overview";
import { useAuthState } from "@/auth";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { strings } from "@/strings";

const copy = strings.admin.overview;

function OverviewLoading() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <span className="sr-only">{strings.status.loading}</span>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <Skeleton key={card} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-64" />
    </div>
  );
}

function OverviewBody({ overview }: { readonly overview: Overview }) {
  return (
    <div className="grid gap-6">
      <KpiCards cards={kpiCards(overview)} />
      <div className="grid gap-6 xl:grid-cols-2">
        <ActivityChart series={overview.series} />
        <LatestEvents events={overview.latestEvents} />
      </div>
    </div>
  );
}

function OverviewScreen({ userId }: { readonly userId: string }) {
  const overview = useAdminOverview(userId);

  function body() {
    if (overview.isPending) return <OverviewLoading />;
    if (overview.isError) return <LoadFailed error={overview.error} onRetry={() => void overview.refetch()} />;
    return <OverviewBody overview={overview.data} />;
  }

  return (
    <section>
      <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">{copy.title}</h1>
      <p className="mt-3 max-w-prose text-foreground/80">{copy.intro}</p>
      <Separator className="my-6" />
      {body()}
    </section>
  );
}

/** /investors/admin (US-011): investor interest on one screen, from GET /admin/overview. */
export function AdminOverview() {
  const state = useAuthState();
  // The admin gate renders this only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <OverviewScreen userId={state.userId} />;
}
