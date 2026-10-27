import { Upload } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { strings } from "@/strings";

import { UPLOAD_ACCEPT } from "./file-types";
import { uploadPercent, uploadStatusText } from "./messages";
import { isBusy } from "./upload-machine";
import type { DocumentUpload } from "./use-document-upload";

const copy = strings.admin;

interface UploadButtonProps {
  readonly title: string;
  readonly hasFile: boolean;
  readonly disabled: boolean;
  readonly onFile: (file: File) => void;
}

/** Upload (or Replace): a button that opens a file picker limited to KP11's types. */
export function UploadButton({ title, hasFile, disabled, onFile }: UploadButtonProps) {
  const picker = useRef<HTMLInputElement>(null);
  const action = hasFile ? copy.documents.actions.replace : copy.documents.actions.upload;
  return (
    <>
      <input
        ref={picker}
        type="file"
        hidden
        accept={UPLOAD_ACCEPT}
        aria-label={copy.documents.fileLabel(title)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared, so picking the same file again still fires a change.
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        aria-label={copy.documents.actionLabel(action, title)}
        onClick={() => picker.current?.click()}
      >
        <Upload />
        {action}
      </Button>
    </>
  );
}

/** The bar and the line under a row while its file uploads, and the outcome after. */
export function UploadStatus({ title, upload }: { readonly title: string; readonly upload: DocumentUpload }) {
  const { state } = upload;
  if (state.phase === "idle") return null;
  const percent = uploadPercent(state);
  const failed = state.phase === "error";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {percent !== null && (
        <Progress value={percent} aria-label={copy.upload.progressLabel(title)} className="w-full max-w-xs" />
      )}
      <p role={failed ? "alert" : "status"} className={cn("text-sm", failed ? "text-destructive" : "text-muted-foreground")}>
        {uploadStatusText(state)}
      </p>
      <Button type="button" size="sm" variant="ghost" onClick={upload.cancel}>
        {isBusy(state) ? copy.upload.cancel : copy.upload.dismiss}
      </Button>
    </div>
  );
}
