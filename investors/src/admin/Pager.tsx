import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

import { pageCountOf, pageRange } from "./investors-model";

const copy = strings.admin.pager;

interface PagerProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  /** Rows on this page. */
  readonly shown: number;
  readonly busy?: boolean;
  readonly onPage: (page: number) => void;
}

/** "Page 2 of 5 · 51–100 of 230" with previous and next; nothing when everything fits on one page. */
export function Pager({ page, pageSize, total, shown, busy = false, onPage }: PagerProps) {
  const pages = pageCountOf(total, pageSize);
  if (pages === 1 && page === 1) return null;
  const range = pageRange(page, pageSize, shown, total);

  return (
    <nav aria-label={copy.label} className="flex flex-wrap items-center justify-between gap-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground" aria-live="polite">
        {copy.pageOf(page, pages)}
        {range && ` · ${range}`}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
          {copy.previous}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>
          {copy.next}
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
