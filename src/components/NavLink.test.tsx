import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NavLink } from "./NavLink";

describe("NavLink", () => {
  it("renders link with to", () => {
    render(
      <MemoryRouter>
        <NavLink to="/dashboard">Dashboard</NavLink>
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: /Dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("applies active class when route matches", () => {
    render(
      <MemoryRouter initialEntries={["/active"]}>
        <Routes>
          <Route path="/active" element={<NavLink to="/active" activeClassName="active-class">Active</NavLink>} />
        </Routes>
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: /Active/i });
    expect(link).toHaveClass("active-class");
  });
});
