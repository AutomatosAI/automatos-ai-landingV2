import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { COVER_IMAGE } from "../brand-images";
import { FOUNDER, type Founder } from "../company-data";
import { CompanyCard } from "../CompanyCard";
import type { ContactRow } from "../contact-rows";
import { FounderCard } from "../FounderCard";
import { TeamList } from "../TeamList";

/* PRD-003 §5.1, written out here so the cards are checked against the PRD, not against themselves. */
const SPINE =
  "One assistant, Auto, runs a team of AI agents that finish a small business's work in its own brand. Open source, on your own server. Hosted beta opens November 2026.";
const FOUNDER_LINE = "I built Automatos myself, with AI agents. Then I brought in the team to scale it.";
const TEAM_ENTRIES = [
  ["Gerard Kavanagh", "Founder"],
  ["Dave", "CTO (since Oct 2026)"],
  ["Ricardo 'Rikki' Capone", "fundraising"],
] as const;
const TEAM_LINE = "Gerard Kavanagh, Founder · Dave, CTO (since Oct 2026) · Ricardo 'Rikki' Capone, fundraising";

/* Invented (KP5): addresses on example domains and a number from the UK's drama range. */
const BOOKING = "https://card.example/someone";
const WITH_LINKEDIN: Founder = { ...FOUNDER, linkedinUrl: "https://www.linkedin.com/in/someone-example" };
const PHONE_ROW: ContactRow = { text: "+44 7700 900123", href: "tel:+447700900123", label: "Mobile" };

const rowLabels = () => screen.getAllByRole("listitem").map((item) => item.lastElementChild?.lastElementChild?.textContent);

describe("CompanyCard", () => {
  it("names the company in an h2 with the spine sentence under it", () => {
    render(<CompanyCard />);
    expect(screen.getByRole("heading", { level: 2, name: "Automatos" })).toBeInTheDocument();
    expect(screen.getByText(SPINE)).toBeInTheDocument();
  });

  it("shows the bundled cover as decoration, fetched first, and the ship tile hidden from assistive tech", () => {
    const { container } = render(<CompanyCard />);
    const cover = container.querySelector("img");
    expect(cover).toHaveAttribute("src", COVER_IMAGE.src);
    expect(cover).toHaveAttribute("alt", "");
    expect(cover).toHaveAttribute("fetchpriority", "high");
    expect(screen.queryByRole("img")).toBeNull();
    const tile = container.querySelector(".bg-ship");
    expect(tile).toHaveAttribute("aria-hidden", "true");
    expect(tile).toHaveClass("text-white");
  });

  it("is centred signed out, and left-aligned with a shorter band and a smaller tile when compact", () => {
    const { container, unmount } = render(<CompanyCard />);
    expect(screen.getByRole("heading", { name: "Automatos" }).parentElement).toHaveClass("text-center");
    expect(container.querySelector(".bg-ship")).toHaveClass("sm:size-[76px]");
    expect(container.querySelector("img")?.parentElement).toHaveClass("sm:h-64");
    unmount();

    const compact = render(<CompanyCard compact />).container;
    expect(screen.getByRole("heading", { name: "Automatos" }).parentElement).not.toHaveClass("text-center");
    expect(compact.querySelector(".bg-ship")).toHaveClass("size-14");
    expect(compact.querySelector("img")?.parentElement).toHaveClass("md:h-[136px]");
  });

  it("holds Home's founder beside it and the team along its foot", () => {
    render(<CompanyCard compact aside={<p>Beside</p>} footer={<p>Along the foot</p>} />);
    const card = screen.getByRole("article");
    expect(within(card).getByText("Beside")).toBeInTheDocument();
    expect(within(card).getByText("Along the foot")).toBeInTheDocument();
  });
});

describe("FounderCard", () => {
  it("names the founder in an h2, with the role, the photo and the line in quotation marks", () => {
    render(<FounderCard />);
    expect(screen.getByRole("heading", { level: 2, name: "Gerard Kavanagh" })).toBeInTheDocument();
    expect(screen.getByText("Founder")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Gerard Kavanagh" })).toBeInTheDocument();
    expect(screen.getByText(`“${FOUNDER_LINE}”`)).toBeInTheDocument();
  });

  it("links the work email, labelled Work, in place", () => {
    render(<FounderCard />);
    const email = screen.getByRole("link", { name: /gerard@automatos\.app/ });
    expect(email).toHaveAttribute("href", "mailto:gerard@automatos.app");
    expect(email).toHaveTextContent("Work");
    expect(email).toHaveAttribute("rel", "noopener noreferrer");
    expect(email).not.toHaveAttribute("target");
  });

  it("hides LinkedIn and Book a call while their addresses are null and no booking is passed", () => {
    render(<FounderCard booking={FOUNDER.bookingUrl} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByText("LinkedIn")).toBeNull();
    expect(screen.queryByText("Book a call")).toBeNull();
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  });

  it("shows LinkedIn once its address is set, in a new tab", () => {
    render(<FounderCard founder={WITH_LINKEDIN} />);
    const linkedin = screen.getByRole("link", { name: /LinkedIn/ });
    expect(linkedin).toHaveAttribute("href", "https://www.linkedin.com/in/someone-example");
    expect(linkedin).toHaveTextContent("www.linkedin.com/in/someone-example");
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(linkedin).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("adds Book a call under the rows when a booking address is passed: the ref tag, a new tab", () => {
    render(<FounderCard booking={BOOKING} />);
    const book = screen.getByRole("link", { name: "Book a call" });
    expect(book).toHaveAttribute("href", "https://card.example/someone?ref=portal");
    expect(book).toHaveAttribute("target", "_blank");
    expect(book).toHaveAttribute("rel", "noopener noreferrer");
    const rows = screen.getByRole("list");
    expect(rows.compareDocumentPosition(book) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts the extra rows after the email row and before LinkedIn", () => {
    render(<FounderCard founder={WITH_LINKEDIN} extraRows={[PHONE_ROW]} />);
    expect(rowLabels()).toEqual(["Work", "Mobile", "LinkedIn"]);
    const phone = screen.getByRole("link", { name: /Mobile/ });
    expect(phone).toHaveAttribute("href", "tel:+447700900123");
    expect(phone).not.toHaveAttribute("target");
  });

  it("is compact on Home: the smaller photo beside the name, no founder line", () => {
    const { container } = render(<FounderCard compact />);
    expect(screen.getByRole("heading", { level: 2, name: "Gerard Kavanagh" })).toBeInTheDocument();
    expect(screen.getByText("Founder")).toBeInTheDocument();
    expect(screen.queryByText(`“${FOUNDER_LINE}”`)).toBeNull();
    expect(container.textContent).not.toContain(FOUNDER_LINE);
    expect(screen.getByRole("img", { name: "Gerard Kavanagh" }).closest(".size-16")).not.toBeNull();
    expect(screen.getByRole("link", { name: /gerard@automatos\.app/ })).toBeInTheDocument();
  });
});

describe("TeamList", () => {
  it("lists the team under an h2, name over role, exactly as §5.1 gives it", () => {
    render(<TeamList variant="list" />);
    expect(screen.getByRole("heading", { level: 2, name: "Team" })).toBeInTheDocument();
    const entries = screen.getAllByRole("listitem").map((item) => [...item.children].map((part) => part.textContent));
    expect(entries).toEqual(TEAM_ENTRIES.map(([name, role]) => [name, role]));
  });

  it("runs the team along one line after a Team label on Home, exactly as §5.1 gives it", () => {
    render(<TeamList variant="inline" />);
    const label = screen.getByText("Team");
    expect(label.nextElementSibling?.textContent).toBe(TEAM_LINE);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
