import { useCallback, useEffect, useReducer, useRef } from "react";

import { uploadDocumentFile } from "./upload-file";
import { IDLE, uploadReducer, type UploadState } from "./upload-machine";
import { useDocumentsCache } from "./use-documents";

export interface DocumentUpload {
  readonly state: UploadState;
  readonly start: (file: File) => void;
  /** Stops an upload in flight (or clears a finished one's message). */
  readonly cancel: () => void;
}

/**
 * One row's upload: the state machine plus the presigned flow. The upload
 * stops when the row goes away; a finished upload writes the server's answer
 * into the cached list.
 */
export function useDocumentUpload(userId: string, documentId: string): DocumentUpload {
  const [state, dispatch] = useReducer(uploadReducer, IDLE);
  const running = useRef<AbortController | null>(null);
  const cache = useDocumentsCache(userId);

  useEffect(() => () => running.current?.abort(), []);

  const start = useCallback(
    (file: File) => {
      running.current?.abort();
      const controller = new AbortController();
      running.current = controller;
      void uploadDocumentFile({ documentId, file, dispatch, signal: controller.signal }).then((document) => {
        if (running.current === controller) running.current = null;
        if (document) cache.put(document);
      });
    },
    [cache, documentId],
  );

  const cancel = useCallback(() => {
    const controller = running.current;
    running.current = null;
    dispatch({ type: "reset" });
    if (controller && !controller.signal.aborted) {
      controller.abort();
      // A finalize may have landed before the abort: show what the server holds.
      cache.refresh();
    }
  }, [cache]);

  return { state, start, cancel };
}
