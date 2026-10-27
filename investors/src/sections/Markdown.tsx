import type { ComponentProps, HTMLAttributes } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";

import { cn } from "@/lib/utils";

import { isSiteAddress, linkAttributes } from "./markdown-links";

/*
 * The admins' markdown (US-009), shown to investors and in the admin
 * editor's preview (W2-03). No raw HTML, ever: skipHtml drops it and there
 * is no rehype-raw, so a <script> or an <img onerror> in the text renders as
 * nothing. Addresses pass react-markdown's default urlTransform, which
 * empties unsafe schemes (javascript:, data:, ...); images show only from
 * the site itself (markdown-links.ts). The page's title is the h1, so
 * markdown headings sit one level under it.
 */

/** react-markdown hands each component its hast node too: it never goes on the DOM. */
function domProps<P extends ExtraProps>({ node, ...rest }: P): Omit<P, "node"> {
  void node;
  return rest;
}

type TextTag = "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "ul" | "ol" | "li" | "blockquote" | "pre" | "code" | "strong" | "em";

/** One markdown element as `Tag`, styled with the site's tokens (KP13). */
function styled(Tag: TextTag, className: string) {
  return function MarkdownElement(props: HTMLAttributes<HTMLElement> & ExtraProps) {
    return <Tag {...domProps(props)} className={className} />;
  };
}

function MarkdownLink(props: ComponentProps<"a"> & ExtraProps) {
  const { href, children, title } = props;
  // An emptied (unsafe) or missing address is no link at all.
  if (!href) return <span>{children}</span>;
  return (
    <a
      href={href}
      title={title}
      {...linkAttributes(href, window.location.origin)}
      className="text-foreground underline underline-offset-4 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </a>
  );
}

function MarkdownImage(props: ComponentProps<"img"> & ExtraProps) {
  const { src, alt, title } = props;
  if (!src || !isSiteAddress(src, window.location.origin)) return null;
  return (
    <img
      src={src}
      alt={alt ?? ""}
      title={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="mt-4 h-auto max-w-full rounded-md border"
    />
  );
}

function Rule() {
  return <hr className="my-8 border-0 border-t border-border" />;
}

const HEADING = "font-serif font-normal leading-tight tracking-[-0.01em] text-foreground first:mt-0";
const LABEL = "mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground first:mt-0";
const LIST = "mt-4 space-y-2 pl-6 leading-relaxed marker:text-muted-foreground first:mt-0";

const COMPONENTS: Components = {
  h1: styled("h2", cn(HEADING, "mt-10 text-3xl")),
  h2: styled("h3", cn(HEADING, "mt-8 text-2xl")),
  h3: styled("h4", cn(HEADING, "mt-6 text-xl")),
  h4: styled("h5", LABEL),
  h5: styled("h6", LABEL),
  h6: styled("h6", LABEL),
  p: styled("p", "mt-4 leading-relaxed text-foreground/85 first:mt-0"),
  ul: styled("ul", cn(LIST, "list-disc")),
  ol: styled("ol", cn(LIST, "list-decimal")),
  li: styled("li", "pl-1 text-foreground/85"),
  blockquote: styled("blockquote", "mt-4 border-l-2 border-border pl-4 text-muted-foreground first:mt-0"),
  pre: styled("pre", "mt-4 overflow-x-auto rounded-md border bg-secondary p-4 font-mono text-sm first:mt-0"),
  code: styled("code", "rounded-md bg-secondary px-1 py-0.5 font-mono text-[0.9em]"),
  strong: styled("strong", "font-semibold text-foreground"),
  em: styled("em", "italic"),
  a: MarkdownLink,
  img: MarkdownImage,
  hr: Rule,
};

interface MarkdownProps {
  /** The section's markdown, as the admins saved it. */
  readonly source: string;
  readonly className?: string;
}

/** Renders the admins' markdown with the site's look and no raw HTML. */
export function Markdown({ source, className }: MarkdownProps) {
  return (
    <div className={cn("max-w-prose break-words", className)}>
      <ReactMarkdown skipHtml components={COMPONENTS}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
