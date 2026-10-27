import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { strings } from "@/strings";

import type { DocumentSummary } from "./investors-api";
import { formatDuration, pagesLabel } from "./investors-model";

const copy = strings.admin.investor.documents;
const columns = copy.columns;
const kinds = strings.admin.documents.kinds;

const numberCell = "whitespace-nowrap text-right tabular-nums";

function SummaryRow({ summary }: { readonly summary: DocumentSummary }) {
  return (
    <TableRow>
      <TableCell className="min-w-[12rem]">
        <p className="font-medium">{summary.title}</p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{kinds[summary.kind]}</p>
      </TableCell>
      <TableCell className={numberCell}>{summary.opens}</TableCell>
      <TableCell className={numberCell}>{pagesLabel(summary.furthestPage, summary.pageCount)}</TableCell>
      <TableCell className={numberCell}>{formatDuration(summary.timeMs)}</TableCell>
      <TableCell className="text-right">{summary.downloaded ? copy.yes : copy.no}</TableCell>
    </TableRow>
  );
}

/** Per document this investor touched: opens, the furthest page, time spent and whether they downloaded it. */
export function DocumentSummaryTable({ documents }: { readonly documents: readonly DocumentSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        {documents.length > 0 && <CardDescription>{copy.note}</CardDescription>}
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.empty}</p>
        ) : (
          <Table aria-label={copy.tableLabel} className="min-w-[36rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{columns.document}</TableHead>
                <TableHead className="text-right">{columns.opens}</TableHead>
                <TableHead className="text-right">{columns.furthestPage}</TableHead>
                <TableHead className="text-right">{columns.time}</TableHead>
                <TableHead className="text-right">{columns.downloaded}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((summary) => (
                <SummaryRow key={summary.documentId} summary={summary} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
