import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import type { InvestorRow as Row } from "./investors-api";
import { sortState, type InvestorsQuery, type SortKey } from "./investors-query";
import { InvestorRow } from "./InvestorRow";

const copy = strings.admin.investors;
const columns = copy.columns;

interface Column {
  readonly label: string;
  /** The server's sort key; none: the column is not sortable. */
  readonly sort?: SortKey;
  readonly align?: "right";
}

/** The W1-15 columns, in the row's order (InvestorRow.tsx). */
const COLUMNS: readonly Column[] = [
  { label: columns.investor, sort: "name" },
  { label: columns.firm, sort: "firm" },
  { label: columns.type },
  { label: columns.cheque },
  { label: columns.source },
  { label: columns.signedUp, sort: "created_at" },
  { label: columns.lastSeen, sort: "last_seen_at" },
  { label: columns.sessions, sort: "sessions", align: "right" },
  { label: columns.time, sort: "total_ms", align: "right" },
  { label: columns.docsOpened, sort: "docs_opened", align: "right" },
  { label: columns.downloads, sort: "downloads", align: "right" },
  { label: columns.deck, align: "right" },
  { label: columns.access, align: "right" },
];

const SORT_ICONS = { ascending: ArrowUp, descending: ArrowDown, none: ArrowUpDown } as const;

function ColumnHead({ column, query, onSort }: { readonly column: Column } & Pick<InvestorsTableProps, "query" | "onSort">) {
  const align = column.align === "right" ? "text-right" : undefined;
  if (!column.sort) return <TableHead className={align}>{column.label}</TableHead>;
  const key = column.sort;
  const state = sortState(query, key);
  const Icon = SORT_ICONS[state];
  return (
    <TableHead className={align} aria-sort={state}>
      <button
        type="button"
        onClick={() => onSort(key)}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-[inherit] underline-offset-4 hover:text-foreground hover:underline",
          state !== "none" && "text-foreground",
        )}
      >
        {column.label}
        <Icon aria-hidden className="size-3" />
      </button>
    </TableHead>
  );
}

interface InvestorsTableProps {
  readonly rows: readonly Row[];
  readonly query: InvestorsQuery;
  readonly onSort: (key: SortKey) => void;
  readonly onBlock: (row: Row) => void;
}

/** One page of investors with sortable heads; the table scrolls sideways on a phone. */
export function InvestorsTable({ rows, query, onSort, onBlock }: InvestorsTableProps) {
  return (
    <Table aria-label={copy.tableLabel} className="min-w-[80rem]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {COLUMNS.map((column) => (
            <ColumnHead key={column.label} column={column} query={query} onSort={onSort} />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <InvestorRow key={row.id} row={row} onBlock={onBlock} />
        ))}
      </TableBody>
    </Table>
  );
}
