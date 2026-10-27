import { Plus } from "lucide-react";
import { useState } from "react";

import { DeleteDocumentDialog } from "@/admin/DeleteDocumentDialog";
import { DocumentDialog, type DocumentDialogMode } from "@/admin/DocumentDialog";
import { DocumentsTable } from "@/admin/DocumentsTable";
import type { AdminDocument } from "@/admin/documents-api";
import { categoriesOf } from "@/admin/documents-model";
import { listFailureMessage } from "@/admin/messages";
import { useAdminDocuments } from "@/admin/use-documents";
import { useAuthState } from "@/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { strings } from "@/strings";

const copy = strings.admin.documents;

type Dialog =
  | { readonly kind: "closed" }
  | DocumentDialogMode
  | { readonly kind: "delete"; readonly document: AdminDocument };

const CLOSED: Dialog = { kind: "closed" };

function ListLoading() {
  return (
    <div className="grid gap-3" aria-busy="true">
      <span className="sr-only">{strings.status.loading}</span>
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} className="h-14 w-full" />
      ))}
    </div>
  );
}

function ListFailed({ error, onRetry }: { readonly error: unknown; readonly onRetry: () => void }) {
  return (
    <div className="grid justify-items-start gap-4">
      <p role="alert" className="max-w-prose text-muted-foreground">
        {listFailureMessage(error)}
      </p>
      <Button type="button" variant="outline" onClick={onRetry}>
        {strings.status.error.retry}
      </Button>
    </div>
  );
}

function DocumentsScreen({ userId }: { readonly userId: string }) {
  const documents = useAdminDocuments(userId);
  const [dialog, setDialog] = useState<Dialog>(CLOSED);
  const close = () => setDialog(CLOSED);
  const list = documents.data ?? [];

  function body() {
    if (documents.isPending) return <ListLoading />;
    if (documents.isError) return <ListFailed error={documents.error} onRetry={() => void documents.refetch()} />;
    if (list.length === 0) return <p className="max-w-prose text-muted-foreground">{copy.empty}</p>;
    return (
      <DocumentsTable
        userId={userId}
        documents={list}
        onEdit={(document) => setDialog({ kind: "edit", document })}
        onDelete={(document) => setDialog({ kind: "delete", document })}
      />
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-normal leading-tight tracking-[-0.01em] sm:text-5xl">{copy.title}</h1>
          <p className="mt-3 max-w-prose text-foreground/80">{copy.intro}</p>
        </div>
        <Button type="button" disabled={!documents.isSuccess} onClick={() => setDialog({ kind: "create" })}>
          <Plus />
          {copy.newDocument}
        </Button>
      </div>
      <Separator className="my-6" />
      {body()}
      <DocumentDialog
        userId={userId}
        mode={dialog.kind === "create" || dialog.kind === "edit" ? dialog : null}
        categories={categoriesOf(list)}
        onClose={close}
      />
      <DeleteDocumentDialog userId={userId} document={dialog.kind === "delete" ? dialog.document : null} onClose={close} />
    </section>
  );
}

/** /investors/admin/documents (US-014): upload, publish, reorder and delete the documents investors read. */
export function AdminDocuments() {
  const state = useAuthState();
  // The admin gate renders this only when signed in; the check narrows the type.
  if (state.status !== "signed_in") return null;
  return <DocumentsScreen userId={state.userId} />;
}
