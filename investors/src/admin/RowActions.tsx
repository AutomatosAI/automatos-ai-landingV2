import { ArrowDown, ArrowUp, ChartColumn, Eye, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { strings } from "@/strings";

import { adminDocumentStatsPath } from "./document-stats-paths";
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

/** An action that goes to another page: a link, so it can open in a new tab. */
function LinkAction({ icon: Icon, name, title, to }: {
  readonly icon: LucideIcon;
  readonly name: string;
  readonly title: string;
  readonly to: string;
}) {
  return (
    <Button asChild size="icon" variant="ghost" className="h-9 w-9">
      <Link to={to} title={name} aria-label={label(name, title)}>
        <Icon />
      </Link>
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

/** Upload / Replace, Preview, Stats, up/down, Edit, Delete. */
export function RowActions(props: RowActionsProps) {
  const { document, first, last, uploading, moving } = props;
  const { title } = document;
  return (
    <div className="flex items-center justify-end gap-1">
      <UploadButton title={title} hasFile={document.hasFile} disabled={uploading} onFile={props.onFile} />
      <IconAction icon={Eye} name={actions.preview} title={title} disabled={!document.hasFile} onClick={props.onPreview} />
      <LinkAction icon={ChartColumn} name={actions.stats} title={title} to={adminDocumentStatsPath(document.id)} />
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
