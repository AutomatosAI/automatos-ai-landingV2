import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Markdown } from "../Markdown";

const renderMarkdown = (source: string) => render(<Markdown source={source} />).container;

describe("Markdown: no raw HTML", () => {
  it("drops a <script> block: nothing runs and nothing of it shows", () => {
    const container = renderMarkdown("Before.\n\n<script>window.__pwned = true</script>\n\nAfter.");
    expect(container.querySelector("script")).toBeNull();
    expect(container).not.toHaveTextContent("__pwned");
    expect(container).toHaveTextContent("Before.");
    expect(container).toHaveTextContent("After.");
    expect((window as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it("drops an inline <img onerror>, keeping the words around it", () => {
    const container = renderMarkdown('Hello <img src="x" onerror="alert(1)"> world');
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.querySelector("p")).toHaveTextContent("Hello world");
  });

  it("drops raw anchors, iframes and inline handlers of every kind", () => {
    const container = renderMarkdown(
      '<a href="javascript:alert(1)">click</a>\n\n<iframe src="https://example.com"></iframe>\n\n<div onclick="alert(1)">x</div>',
    );
    expect(container.querySelector("a, iframe, div[onclick]")).toBeNull();
  });

  it("renders a javascript: or data: link as plain text, not a link", () => {
    const container = renderMarkdown("[one](javascript:alert(1)) and [two](data:text/html,hi)");
    expect(container.querySelector("a")).toBeNull();
    expect(container).toHaveTextContent("one and two");
  });

  it("shows no image whose address is unsafe", () => {
    const container = renderMarkdown("![pixel](data:image/png;base64,AAAA)");
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("Markdown: links", () => {
  it("opens an address on another site in a new tab, with noopener noreferrer", () => {
    renderMarkdown("[Book a call](https://booking.example.com/automatos)");
    const link = screen.getByRole("link", { name: "Book a call" });
    expect(link).toHaveAttribute("href", "https://booking.example.com/automatos");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("opens the site's own pages and mailto: in place, still with noopener noreferrer", () => {
    renderMarkdown(`[Privacy](/privacy) [Same site](${window.location.origin}/investors) [Email](mailto:hello@example.com)`);
    for (const name of ["Privacy", "Same site", "Email"]) {
      const link = screen.getByRole("link", { name });
      expect(link).not.toHaveAttribute("target");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});

describe("Markdown: the site's look", () => {
  it("puts headings one level under the page's title, styled in the serif", () => {
    renderMarkdown("# Who we are\n\n## Founders\n\n### Advisers\n\n#### Notes");
    const h2 = screen.getByRole("heading", { level: 2, name: "Who we are" });
    expect(h2).toHaveClass("font-serif");
    expect(screen.getByRole("heading", { level: 3, name: "Founders" })).toHaveClass("font-serif");
    expect(screen.getByRole("heading", { level: 4, name: "Advisers" })).toHaveClass("font-serif");
    expect(screen.getByRole("heading", { level: 5, name: "Notes" })).toHaveClass("font-mono");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("renders paragraphs, bullet and numbered lists with the tokens' classes", () => {
    const container = renderMarkdown("First paragraph.\n\n- one\n- two\n\n1. first\n2. second");
    expect(container.querySelector("p")).toHaveClass("text-foreground/85");
    expect(container.querySelector("ul")).toHaveClass("list-disc");
    expect(container.querySelector("ol")).toHaveClass("list-decimal");
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["one", "two", "first", "second"]);
  });

  it("never puts react-markdown's node on the DOM", () => {
    const container = renderMarkdown("# Title\n\nText with [a link](https://example.com).");
    expect(container.querySelector("[node]")).toBeNull();
  });

  it("shows an image from the site itself, without sending the page as referrer", () => {
    const container = renderMarkdown("![Team photo](/images/team.jpg)");
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "/images/team.jpg");
    expect(image).toHaveAttribute("alt", "Team photo");
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("shows no image from another host, which would learn who read the page", () => {
    const container = renderMarkdown("![pixel](https://images.example.com/p.gif) ![relative](//images.example.com/q.gif)");
    expect(container.querySelector("img")).toBeNull();
  });
});
