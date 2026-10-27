import { useCallback, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { strings } from "@/strings";

import { DocumentFields, type SetDocumentField } from "./DocumentFields";
import {
  EMPTY_DOCUMENT_FORM,
  documentFieldId,
  documentSaveFailure,
  firstInvalidDocumentField,
  formValuesOf,
  toDocumentBody,
  validateDocumentForm,
  type DocumentFieldErrors,
} from "./document-form";
import type { AdminDocument } from "./documents-api";
import { useCreateDocument, useEditDocument } from "./use-documents";

const copy = strings.admin.form;

/** Which form is open: a new document, or the metadata of an existing one. */
export type DocumentDialogMode = { readonly kind: "create" } | { readonly kind: "edit"; readonly document: AdminDocument };

interface DocumentFormProps {
  readonly userId: string;
  readonly mode: DocumentDialogMode;
  readonly categories: readonly string[];
  readonly onDone: () => void;
}

function useSaveDocument(userId: string, mode: DocumentDialogMode) {
  const create = useCreateDocument(userId);
  const edit = useEditDocument(userId);
  const pending = create.isPending || edit.isPending;
  const save = (body: ReturnType<typeof toDocumentBody>, callbacks: { onSuccess: () => void; onError: (e: unknown) => void }) =>
    mode.kind === "create" ? create.mutate(body, callbacks) : edit.mutate({ id: mode.document.id, patch: body }, callbacks);
  return { save, pending };
}

function DocumentForm({ userId, mode, categories, onDone }: DocumentFormProps) {
  const [values, setValues] = useState(mode.kind === "edit" ? formValuesOf(mode.document) : EMPTY_DOCUMENT_FORM);
  const [errors, setErrors] = useState<DocumentFieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const { save, pending } = useSaveDocument(userId, mode);

  const set = useCallback<SetDocumentField>((field, value) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== field)));
    setNotice(null);
  }, []);

  function showErrors(fields: DocumentFieldErrors, text: string) {
    setErrors(fields);
    setNotice(text);
    const first = firstInvalidDocumentField(fields);
    if (first !== null) document.getElementById(documentFieldId(first))?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateDocumentForm(values);
    if (Object.keys(found).length > 0) return showErrors(found, copy.checkFields);
    setNotice(null);
    save(toDocumentBody(values), {
      onSuccess: onDone,
      onError: (error) => {
        const failure = documentSaveFailure(error);
        showErrors(failure.fields, failure.message);
      },
    });
  }

  const label = pending ? copy.saving : mode.kind === "create" ? copy.create : copy.save;
  return (
    <form noValidate onSubmit={submit} className="grid gap-6">
      <DocumentFields form={{ values, errors, disabled: pending, set, categories }} />
      {notice && (
        <p role="alert" className="text-sm text-destructive">
          {notice}
        </p>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            {copy.cancel}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {label}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface DocumentDialogProps {
  readonly userId: string;
  /** Null: closed. */
  readonly mode: DocumentDialogMode | null;
  readonly categories: readonly string[];
  readonly onClose: () => void;
}

/** New document (US-014: title, description, category, kind, alert) and Edit, in one dialog. */
export function DocumentDialog({ userId, mode, categories, onClose }: DocumentDialogProps) {
  const editing = mode?.kind === "edit";
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      {mode && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? copy.editTitle : copy.createTitle}</DialogTitle>
            <DialogDescription>{editing ? copy.editIntro : copy.createIntro}</DialogDescription>
          </DialogHeader>
          <DocumentForm
            key={mode.kind === "edit" ? mode.document.id : "create"}
            userId={userId}
            mode={mode}
            categories={categories}
            onDone={onClose}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
