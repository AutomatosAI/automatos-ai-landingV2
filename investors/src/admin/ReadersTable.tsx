import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminInvestorPath } from "@/lib/paths";
import { strings } from "@/strings";

import type { DocumentStats } from "./document-stats-api";
import { readerFacts, type ReaderFacts } from "./document-stats-model";

const copy = strings.admin.stats.readers;
const columns = copy.columns;

const numberCell = "whitespace-nowrap text-right tabular-nums";

function ReaderRow({ reader }: { readonly reader: ReaderFacts }) {
  return (
    <TableRow>
      <TableCell className="min-w-[12rem]">
        <Link to={adminInvestorPath(reader.investorId)} className="font-medium underline-offset-4 hover:underline">
          {reader.name}
        </Link>
        {reader.firm && <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{reader.firm}</p>}
      </TableCell>
      <TableCell className={numberCell}>{reader.furthestPage}</TableCell>
      <TableCell className={numberCell}>{reader.time}</TableCell>
      <TableCell className="text-right">{reader.downloaded}</TableCell>
      <TableCell className="whitespace-nowrap text-right font-mono text-xs">{reader.lastOpened}</TableCell>
    </TableRow>
  );
}

/** Who read this version, newest open first, each linking to the investor's page; scrolls sideways on a phone. */
export function ReadersTable({ stats }: { readonly stats: DocumentStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.readers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.empty}</p>
        ) : (
          <Table aria-label={copy.tableLabel} className="min-w-[40rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{columns.investor}</TableHead>
                <TableHead className="text-right">{columns.furthestPage}</TableHead>
                <TableHead className="text-right">{columns.time}</TableHead>
                <TableHead className="text-right">{columns.downloaded}</TableHead>
                <TableHead className="text-right">{columns.lastOpened}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.readers.map((reader) => (
                <ReaderRow key={reader.investorId} reader={readerFacts(reader, stats)} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
