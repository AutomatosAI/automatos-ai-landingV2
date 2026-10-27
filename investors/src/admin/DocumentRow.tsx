import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatBytes, formatDate } from "@/lib/format";
import { strings } from "@/strings";

import { RowActions } from "./RowActions";
import { UploadStatus } from "./UploadControls";
import { requestPreviewLink, type AdminDocument, type DocumentPatch } from "./documents-api";
import type { MoveDirection } from "./documents-model";
import { changeFailureMessage } from "./messages";
import { openPreview } from "./preview";
import { isBusy } from "./upload-machine";
import { useDocumentUpload } from "./use-document-upload";
import { useEditDocument } from "./use-documents";

const copy = strings.admin.documents;

/** The table's column count, for the status line's colSpan; the headings are checked against it. */
export const DOCUMENT_COLUMNS = 9 as const;

function TitleCell({ document }: { readonly document: AdminDocument }) {
  const pages = document.pageCount === null ? null : copy.pages(document.pageCount);
  const detail = document.hasFile ? [document.fileName, pages].filter(Boolean).join(" · ") : copy.noFile;
  return (
    <TableCell className="min-w-[14rem]">
      <p className="font-medium">{document.title}</p>
      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{detail}</p>
    </TableCell>
  );
}

export interface DocumentRowProps {
  readonly userId: string;
  readonly document: AdminDocument;
  readonly first: boolean;
  readonly last: boolean;
  readonly moving: boolean;
  readonly onMove: (id: string, direction: MoveDirection) => void;
  readonly onEdit: (document: AdminDocument) => void;
  readonly onDelete: (document: AdminDocument) => void;
}

/** One document: its facts, the publish and alert switches, its actions, and a line for uploads and errors. */
export function DocumentRow({ userId, document, first, last, moving, onMove, onEdit, onDelete }: DocumentRowProps) {
  const upload = useDocumentUpload(userId, document.id);
  const edit = useEditDocument(userId);
  const [notice, setNotice] = useState<string | null>(null);
  const uploading = isBusy(upload.state);

  function change(patch: DocumentPatch) {
    setNotice(null);
    edit.mutate({ id: document.id, patch }, { onError: (error) => setNotice(changeFailureMessage(error)) });
  }

  async function preview() {
    setNotice(null);
    const result = await openPreview(() => requestPreviewLink(document.id));
    if (result !== "opened") setNotice(copy.preview[result]);
  }

  const hasStatus = upload.state.phase !== "idle" || notice !== null;
  return (
    <>
      <TableRow className={hasStatus ? "border-b-0" : undefined}>
        <TitleCell document={document} />
        <TableCell className="whitespace-nowrap">{document.category}</TableCell>
        <TableCell className="whitespace-nowrap">{copy.kinds[document.kind]}</TableCell>
        <TableCell className="font-mono text-xs">{document.hasFile ? `v${document.version}` : copy.none}</TableCell>
        <TableCell className="whitespace-nowrap font-mono text-xs">
          {document.sizeBytes === null ? copy.none : formatBytes(document.sizeBytes)}
        </TableCell>
        <TableCell>
          <Switch
            checked={document.published}
            disabled={edit.isPending || (!document.published && !document.hasFile)}
            title={document.hasFile ? undefined : copy.publishNeedsFile}
            aria-label={copy.publishedLabel(document.title)}
            onCheckedChange={(published) => change({ published })}
          />
        </TableCell>
        <TableCell>
          <Switch
            checked={document.alertOnFirstOpen}
            disabled={edit.isPending}
            aria-label={copy.alertLabel(document.title)}
            onCheckedChange={(alertOnFirstOpen) => change({ alertOnFirstOpen })}
          />
        </TableCell>
        <TableCell className="whitespace-nowrap font-mono text-xs">{formatDate(document.updatedAt)}</TableCell>
        <TableCell>
          <RowActions
            document={document}
            first={first}
            last={last}
            uploading={uploading}
            moving={moving}
            onFile={upload.start}
            onPreview={() => void preview()}
            onMove={(direction) => onMove(document.id, direction)}
            onEdit={() => onEdit(document)}
            onDelete={() => onDelete(document)}
          />
        </TableCell>
      </TableRow>
      {hasStatus && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={DOCUMENT_COLUMNS} className="pt-0">
            <UploadStatus title={document.title} upload={upload} />
            {notice && (
              <p role="alert" className="text-sm text-destructive">
                {notice}
              </p>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
