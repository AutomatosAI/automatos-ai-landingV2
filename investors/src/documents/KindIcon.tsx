import { File, FileSpreadsheet, FileText, FileType, FileVideoCamera, Presentation, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { DocumentKind } from "./kinds";

const KIND_ICONS: Readonly<Record<DocumentKind, LucideIcon>> = {
  pdf: FileText,
  video: FileVideoCamera,
  spreadsheet: FileSpreadsheet,
  slides: Presentation,
  doc: FileType,
  other: File,
};

/** The kind's icon; decorative, since the card names the kind in words. */
export function KindIcon({ kind, className }: { readonly kind: DocumentKind; readonly className?: string }) {
  const Icon = KIND_ICONS[kind];
  return <Icon aria-hidden="true" className={cn("h-5 w-5 shrink-0", className)} />;
}
