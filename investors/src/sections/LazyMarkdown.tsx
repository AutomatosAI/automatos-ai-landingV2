import { lazy, Suspense, type ReactNode } from "react";

// react-markdown and its parser add about 130 kB: they load with the first section that has text.
const Markdown = lazy(() => import("./Markdown").then((module) => ({ default: module.Markdown })));

interface LazyMarkdownProps {
  readonly source: string;
  /** Shown while the renderer loads. */
  readonly fallback?: ReactNode;
}

/** Markdown.tsx, loaded on demand: the same renderer and the same rules. */
export function LazyMarkdown({ source, fallback = null }: LazyMarkdownProps) {
  return (
    <Suspense fallback={fallback}>
      <Markdown source={source} />
    </Suspense>
  );
}
