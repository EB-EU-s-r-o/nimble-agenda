import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OfflinePage from "./OfflinePage";

describe("OfflinePage", () => {
  it("renders Si offline heading", () => {
    render(<OfflinePage />);
    expect(screen.getByRole("heading", { name: /Si offline/i })).toBeInTheDocument();
  });

  it("renders link to reception", () => {
    render(<OfflinePage />);
    const link = screen.getByRole("link", { name: /Otvoriť recepciu/i });
    expect(link).toHaveAttribute("href", "/reception");
  });

  it("renders sync message", () => {
    render(<OfflinePage />);
    expect(screen.getByText(/zosynchronizujú/i)).toBeInTheDocument();
  });
});
