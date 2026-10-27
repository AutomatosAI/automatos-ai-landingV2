import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { strings } from "@/strings";

import type { AdminDocument } from "./documents-api";
import { useDeleteDocument } from "./use-documents";

const copy = strings.admin.delete;

interface DeleteDocumentDialogProps {
  readonly userId: string;
  /** The document to delete; null: closed. */
  readonly document: AdminDocument | null;
  readonly onClose: () => void;
}

function DeleteConfirm({ userId, document, onClose }: DeleteDocumentDialogProps & { readonly document: AdminDocument }) {
  const remove = useDeleteDocument(userId);
  const [failed, setFailed] = useState(false);

  function confirm() {
    setFailed(false);
    remove.mutate(document.id, { onSuccess: onClose, onError: () => setFailed(true) });
  }

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{copy.title}</AlertDialogTitle>
        <AlertDialogDescription>{copy.body(document.title)}</AlertDialogDescription>
      </AlertDialogHeader>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {copy.failed}
        </p>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={remove.isPending}>{copy.cancel}</AlertDialogCancel>
        {/* A plain button: the dialog stays open until the server has answered. */}
        <Button type="button" variant="destructive" disabled={remove.isPending} onClick={confirm}>
          {remove.isPending ? copy.deleting : copy.confirm}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/** Delete with confirmation: the row, its file in storage, and investors' access go together. */
export function DeleteDocumentDialog({ userId, document, onClose }: DeleteDocumentDialogProps) {
  return (
    <AlertDialog open={document !== null} onOpenChange={(open) => !open && onClose()}>
      {document && <DeleteConfirm key={document.id} userId={userId} document={document} onClose={onClose} />}
    </AlertDialog>
  );
}
