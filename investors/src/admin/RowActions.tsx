import { ArrowDown, ArrowUp, Eye, Pencil, Trash2, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

import { UploadButton } from "./UploadControls";
import type { AdminDocument } from "./documents-api";
import type { MoveDirection } from "./documents-model";

const actions = strings.admin.documents.actions;
const label = strings.admin.documents.actionLabel;

function IconAction({ icon: Icon, name, title, disabled, onClick }: {
  readonly icon: LucideIcon;
  readonly name: string;
  readonly title: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-9 w-9"
      title={name}
      aria-label={label(name, title)}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon />
    </Button>
  );
}

export interface RowActionsProps {
  readonly document: AdminDocument;
  readonly first: boolean;
  readonly last: boolean;
  /** An upload or a move is in flight: the actions that would race it wait. */
  readonly uploading: boolean;
  readonly moving: boolean;
  readonly onFile: (file: File) => void;
  readonly onPreview: () => void;
  readonly onMove: (direction: MoveDirection) => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

/** Upload / Replace, Preview, up/down, Edit, Delete. */
export function RowActions(props: RowActionsProps) {
  const { document, first, last, uploading, moving } = props;
  const { title } = document;
  return (
    <div className="flex items-center justify-end gap-1">
      <UploadButton title={title} hasFile={document.hasFile} disabled={uploading} onFile={props.onFile} />
      <IconAction icon={Eye} name={actions.preview} title={title} disabled={!document.hasFile} onClick={props.onPreview} />
      <IconAction icon={ArrowUp} name={actions.moveUp} title={title} disabled={first || moving} onClick={() => props.onMove("up")} />
      <IconAction
        icon={ArrowDown}
        name={actions.moveDown}
        title={title}
        disabled={last || moving}
        onClick={() => props.onMove("down")}
      />
      <IconAction icon={Pencil} name={actions.edit} title={title} onClick={props.onEdit} />
      <IconAction icon={Trash2} name={actions.delete} title={title} disabled={uploading} onClick={props.onDelete} />
    </div>
  );
}
