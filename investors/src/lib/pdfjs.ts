import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { pdfjs } from "react-pdf";

// The worker ships with the app (no CDN), set once for every caller. Import
// this module lazily (import("@/lib/pdfjs")): pdf.js stays out of the main bundle.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjs };
