import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { App } from "../App";
import { ROUTER_FUTURE } from "../lib/paths";
import { strings } from "../strings";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]} future={ROUTER_FUTURE}>
      <App />
    </MemoryRouter>,
  );
}

describe("App", () => {
  it("renders the shell header on the home route", () => {
    renderAt("/");
    const banner = screen.getByRole("banner");
    expect(banner).toHaveTextContent(strings.shell.wordmark);
    expect(banner).toHaveTextContent(strings.shell.section);
    expect(screen.getByRole("link", { name: strings.shell.homeLabel })).toHaveAttribute("href", "/");
  });

  it("renders the placeholder for any path under the app", () => {
    renderAt("/admin/x");
    expect(screen.getByRole("heading", { level: 1, name: strings.placeholder.title })).toBeInTheDocument();
  });
});
