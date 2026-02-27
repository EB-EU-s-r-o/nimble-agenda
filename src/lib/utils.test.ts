import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (utils)", () => {
  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });

  it("merges single class", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("merges multiple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("handles tailwind conflict (later wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles undefined and null", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});
