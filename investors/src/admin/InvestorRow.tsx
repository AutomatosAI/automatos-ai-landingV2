import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import { adminInvestorPath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import type { InvestorRow as Row } from "./investors-api";
import {
  chequeSizeLabel,
  deckProgressLabel,
  formatDuration,
  investorName,
  investorTypeLabel,
  sourceLabel,
} from "./investors-model";

const copy = strings.admin.investors;

/** A small mono tag: "Blocked". */
export function BlockedTag({ className }: { readonly className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-destructive/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-destructive",
        className,
      )}
    >
      {copy.blocked}
    </span>
  );
}

function NameCell({ row }: { readonly row: Row }) {
  return (
    <TableCell className="min-w-[14rem]">
      <Link to={adminInvestorPath(row.id)} className="font-medium underline-offset-4 hover:underline">
        {investorName(row)}
      </Link>
      {row.name !== null && <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{row.email}</p>}
    </TableCell>
  );
}

const numberCell = "whitespace-nowrap text-right tabular-nums";

interface InvestorRowProps {
  readonly row: Row;
  readonly onBlock: (row: Row) => void;
}

/** One investor: who, their profile choices, their engagement, and block or unblock. */
export function InvestorRow({ row, onBlock }: InvestorRowProps) {
  const action = row.blocked ? copy.unblock : copy.block;
  return (
    <TableRow>
      <NameCell row={row} />
      <TableCell>{row.firm ?? copy.none}</TableCell>
      <TableCell className="whitespace-nowrap">{investorTypeLabel(row.investorType)}</TableCell>
      <TableCell className="whitespace-nowrap">{chequeSizeLabel(row.chequeSize)}</TableCell>
      <TableCell className="whitespace-nowrap">{sourceLabel(row.source)}</TableCell>
      <TableCell className="whitespace-nowrap">{formatDate(row.createdAt)}</TableCell>
      <TableCell className="whitespace-nowrap">{formatDateTime(row.lastSeenAt)}</TableCell>
      <TableCell className={numberCell}>{row.sessions}</TableCell>
      <TableCell className={numberCell}>{formatDuration(row.totalMs)}</TableCell>
      <TableCell className={numberCell}>{row.docsOpened}</TableCell>
      <TableCell className={numberCell}>{row.downloads}</TableCell>
      <TableCell className={numberCell}>{deckProgressLabel(row.deckProgress)}</TableCell>
      <TableCell className="whitespace-nowrap text-right">
        <div className="inline-flex items-center gap-2">
          {row.blocked && <BlockedTag />}
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={copy.actionLabel(action, investorName(row))}
            onClick={() => onBlock(row)}
          >
            {action}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
