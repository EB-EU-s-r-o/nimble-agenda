import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("NotFound", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders 404 heading", () => {
    wrap(<NotFound />);
    expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
  });

  it("renders message about page not found", () => {
    wrap(<NotFound />);
    expect(screen.getByText(/Stránka nebola nájdená/i)).toBeInTheDocument();
  });

  it("renders link to home", () => {
    wrap(<NotFound />);
    const link = screen.getByRole("link", { name: /Späť na úvod/i });
    expect(link).toHaveAttribute("href", "/");
  });
});
