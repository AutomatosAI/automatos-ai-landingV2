import { ArrowLeft } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import type { DocumentStats } from "@/admin/document-stats-api";
import { documentMeta, isOlderVersion, statsCards, versionOptions } from "@/admin/document-stats-model";
import { parseVersion, VERSION_PARAM, versionSearch } from "@/admin/document-stats-paths";
import { DocumentStatsCards } from "@/admin/DocumentStatsCards";
import { LoadFailed } from "@/admin/LoadFailed";
import { PageCharts } from "@/admin/PageCharts";
import { ReadersTable } from "@/admin/ReadersTable";
import { useDocumentStats } from "@/admin/use-document-stats";
import { VersionPicker } from "@/admin/VersionPicker";
import { ApiError } from "@/api/errors";
import { useAuthState } from "@/auth";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ADMIN_DOCUMENTS_PATH } from "@/lib/paths";
import { strings } from "@/strings";

const copy = strings.admin.stats;

function BackLink() {
  return (
    <Link
      to={ADMIN_DOCUMENTS_PATH}
      className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      <ArrowLeft aria-hidden className="size-4" />
      {copy.back}
    </Link>
  );
}

function StatsLoading() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <span className="sr-only">{strings.status.loading}</span>
      <Skeleton className="h-12 w-2/3" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <Skeleton key={card} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-48" />
    </div>
  );
}

function Missing() {
  return (
    <div className="grid gap-3">
      <h1 className="font-serif text-4xl font-normal leading-tight">{copy.missing.title}</h1>
      <p className="max-w-prose text-muted-foreground">{copy.missing.body}</p>
    </div>
  );
}

function CountingNotes() {
  return (
    <section aria-label={copy.notes.label} className="text-xs text-muted-foreground">
      <ul className="grid gap-1">
        {copy.notes.items.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  );
}

interface StatsBodyProps {
  readonly stats: DocumentStats;
  /** The version in the address; it may still be loading while the last answer shows. */
  readonly selected: number;
  readonly busy: boolean;
  readonly onVersion: (version: number) => void;
}

function StatsBody({ stats, selected, busy, onVersion }: StatsBodyProps) {
  const { document } = stats;
  return (
    <div className="grid gap-6" aria-busy={busy || undefined}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">
            {document.title}
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {documentMeta(document)}
          </p>
          <p className="mt-3 max-w-prose text-foreground/80">{copy.intro}</p>
        </div>
        <VersionPicker options={versionOptions(stats, selected)} value={selected} onChange={onVersion} />
      </div>
      <Separator />
      {isOlderVersion(stats) && <p className="max-w-prose text-sm text-muted-foreground">{copy.version.older}</p>}
      <DocumentStatsCards cards={statsCards(stats)} />
      <PageCharts stats={stats} />
      <ReadersTable stats={stats} />
      <CountingNotes />
    </div>
  );
}

function StatsScreen({ userId, id }: { readonly userId: string; readonly id: string }) {
  const [params, setParams] = useSearchParams();
  const version = parseVersion(params.get(VERSION_PARAM));
  const stats = useDocumentStats(userId, id, version);

  function body() {
    if (stats.isPending) return <StatsLoading />;
    if (stats.isError) {
      if (stats.error instanceof ApiError && stats.error.kind === "not_found") return <Missing />;
      return <LoadFailed error={stats.error} onRetry={() => void stats.refetch()} />;
    }
    const current = stats.data.document.version;
    return (
      <StatsBody
        stats={stats.data}
        selected={version ?? current}
        busy={stats.isPlaceholderData}
        onVersion={(next) => setParams(versionSearch(next, current))}
      />
    );
  }

  return (
    <section className="grid gap-6">
      <BackLink />
      {body()}
    </section>
  );
}

/** /investors/admin/documents/:id/stats (US-015): who read a version of a document, how far, and where they stopped. */
export function AdminDocumentStats() {
  const state = useAuthState();
  const { id } = useParams();
  // The admin gate renders this only when signed in; the check narrows the type.
  if (state.status !== "signed_in" || !id) return null;
  return <StatsScreen key={id} userId={state.userId} id={id} />;
}
