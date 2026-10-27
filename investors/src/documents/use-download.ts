import { useMutation } from "@tanstack/react-query";

import { downloadDocument } from "./download";
import { isGone, linkFailureMessage } from "./messages";

export interface DownloadAction {
  readonly download: () => void;
  /** While the link is being issued. */
  readonly busy: boolean;
  /** Why the last try failed, in plain words; null otherwise. */
  readonly message: string | null;
}

/** A card's download. A 404 means the document went: onGone reads the list again. */
export function useDownload(documentId: string, onGone: () => void): DownloadAction {
  const mutation = useMutation({
    mutationFn: () => downloadDocument(documentId),
    onError: (error) => {
      if (isGone(error)) onGone();
    },
  });
  return {
    download: () => mutation.mutate(),
    busy: mutation.isPending,
    message: mutation.isError ? linkFailureMessage(mutation.error) : null,
  };
}
