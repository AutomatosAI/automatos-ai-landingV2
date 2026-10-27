import { useState } from "react";

import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { strings } from "@/strings";

import { DOCUMENT_COLUMNS, DocumentRow } from "./DocumentRow";
import type { AdminDocument } from "./documents-api";
import { reorderPlan, type MoveDirection } from "./documents-model";
import { useReorderDocuments } from "./use-documents";

const copy = strings.admin.documents;
const columns = copy.columns;

const HEADINGS = [
  columns.title,
  columns.category,
  columns.kind,
  columns.version,
  columns.size,
  columns.published,
  columns.alert,
  columns.updated,
  columns.actions,
] as const satisfies { length: typeof DOCUMENT_COLUMNS };

interface DocumentsTableProps {
  readonly userId: string;
  /** In the server's order (useAdminDocuments sorts them). */
  readonly documents: readonly AdminDocument[];
  readonly onEdit: (document: AdminDocument) => void;
  readonly onDelete: (document: AdminDocument) => void;
}

/** Every document, published or not, in the order investors see them; wide tables scroll sideways on a phone. */
export function DocumentsTable({ userId, documents, onEdit, onDelete }: DocumentsTableProps) {
  const reorder = useReorderDocuments(userId);
  const [moveFailed, setMoveFailed] = useState(false);

  function move(id: string, direction: MoveDirection) {
    const plan = reorderPlan(documents, id, direction);
    if (plan.length === 0) return;
    setMoveFailed(false);
    reorder.mutate(plan, { onError: () => setMoveFailed(true) });
  }

  return (
    <div className="grid gap-3">
      {moveFailed && (
        <p role="alert" className="text-sm text-destructive">
          {copy.moveFailed}
        </p>
      )}
      <Table aria-label={copy.tableLabel} className="min-w-[60rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {HEADINGS.map((heading, index) => (
              <TableHead key={heading} className={index === HEADINGS.length - 1 ? "text-right" : undefined}>
                {heading}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document, index) => (
            <DocumentRow
              key={document.id}
              userId={userId}
              document={document}
              first={index === 0}
              last={index === documents.length - 1}
              moving={reorder.isPending}
              onMove={move}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
