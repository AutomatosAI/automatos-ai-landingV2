import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { BlockDialog, type BlockTarget } from "@/admin/BlockDialog";
import { CsvExportButton } from "@/admin/CsvExportButton";
import { InvestorFilters } from "@/admin/InvestorFilters";
import type { InvestorList } from "@/admin/investors-api";
import {
  apiSearch,
  cleanSearch,
  clearFilters,
  hasFilters,
  parseInvestorsQuery,
  serialiseInvestorsQuery,
  toggleSort,
  withFilters,
  withPage,
  type InvestorsQuery,
} from "@/admin/investors-query";
import { InvestorsTable } from "@/admin/InvestorsTable";
import { LoadFailed } from "@/admin/LoadFailed";
import { Pager } from "@/admin/Pager";
import { useInvestorList } from "@/admin/use-investors";
import { useAuthState } from "@/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { strings } from "@/strings";

const copy = strings.admin.investors;

function ListLoading() {
  return (
    <div className="grid gap-3" aria-busy="true">
      <span className="sr-only">{strings.status.loading}</span>
      {[0, 1, 2, 3].map((row) => (
        <Skeleton key={row} className="h-14 w-full" />
      ))}
    </div>
  );
}

function ColumnNotes() {
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

interface ListBodyProps {
  readonly list: InvestorList;
  readonly query: InvestorsQuery;
  readonly busy: boolean;
  readonly go: (next: InvestorsQuery) => void;
  readonly onBlock: (target: BlockTarget) => void;
}

function ListBody({ list, query, busy, go, onBlock }: ListBodyProps) {
  if (list.total === 0) return <p className="max-w-prose text-muted-foreground">{hasFilters(query) ? copy.noMatch : copy.empty}</p>;
  if (list.investors.length === 0) {
    return (
      <div className="grid justify-items-start gap-4">
        <p className="text-muted-foreground">{copy.pageEmpty}</p>
        <Button type="button" variant="outline" onClick={() => go(withPage(query, 1))}>
          {copy.firstPage}
        </Button>
      </div>
    );
  }
  return (
    <div className={busy ? "grid gap-4 opacity-60 transition-opacity" : "grid gap-4"} aria-busy={busy}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{copy.results(list.total)}</p>
        <CsvExportButton query={query} />
      </div>
      <InvestorsTable rows={list.investors} query={query} onSort={(key) => go(toggleSort(query, key))} onBlock={onBlock} />
      <Pager
        page={query.page}
        pageSize={list.pageSize}
        total={list.total}
        shown={list.investors.length}
        busy={busy}
        onPage={(page) => go(withPage(query, page))}
      />
      <ColumnNotes />
    </div>
  );
}

function InvestorsScreen({ userId }: { readonly userId: string }) {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseInvestorsQuery(params), [params]);
  const list = useInvestorList(userId, apiSearch(query));
  const [target, setTarget] = useState<BlockTarget | null>(null);

  // Typing replaces the address (no history entry per pause); sorting, filters and pages push one.
  const go = (next: InvestorsQuery, replace = false) => setParams(serialiseInvestorsQuery(next), { replace });

  function filter(change: Partial<Pick<InvestorsQuery, "q" | "type" | "source">>) {
    const typing = change.q !== undefined;
    if (typing && cleanSearch(change.q ?? "") === query.q) return;
    go(withFilters(query, change), typing);
  }

  function body() {
    if (list.isPending) return <ListLoading />;
    if (list.isError) return <LoadFailed error={list.error} onRetry={() => void list.refetch()} />;
    return <ListBody list={list.data} query={query} busy={list.isPlaceholderData} go={go} onBlock={setTarget} />;
  }

  return (
    <section>
      <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">{copy.title}</h1>
      <p className="mt-3 max-w-prose text-foreground/80">{copy.intro}</p>
      <Separator className="my-6" />
      <div className="grid gap-6">
        <InvestorFilters query={query} onChange={filter} onClear={() => go(clearFilters(query))} />
        {body()}
      </div>
      <BlockDialog userId={userId} target={target} onClose={() => setTarget(null)} />
    </section>
  );
}

/** /investors/admin/investors (US-012): every investor with their engagement; search, filter, sort, block. */
export function AdminInvestors() {
  const state = useAuthState();
  // The admin gate renders this only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <InvestorsScreen userId={state.userId} />;
}
