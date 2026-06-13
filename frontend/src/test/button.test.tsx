import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

describe("cn / tailwind-merge custom font sizes", () => {
  it("keeps a text color alongside a custom font-size token", () => {
    const result = cn("text-body-sm", "text-white");
    expect(result).toContain("text-white");
    expect(result).toContain("text-body-sm");
  });

  it("still de-dupes conflicting font-size tokens (last wins)", () => {
    const result = cn("text-body-md", "text-body-sm");
    expect(result).toContain("text-body-sm");
    expect(result).not.toContain("text-body-md");
  });
});

describe("Button primary text colour", () => {
  it("renders primary (default) buttons with white text even at size sm", () => {
    render(<Button size="sm">Create Product</Button>);
    const btn = screen.getByRole("button", { name: "Create Product" });
    // The regression: text-white must NOT be stripped by the size's text-body-sm.
    expect(btn.className).toContain("text-white");
    expect(btn.className).toContain("font-semibold");
    expect(btn.className).toContain("bg-primary-container");
  });

  it("keeps secondary buttons on dark on-surface text", () => {
    render(<Button variant="secondary" size="sm">Cancel</Button>);
    const btn = screen.getByRole("button", { name: "Cancel" });
    expect(btn.className).toContain("text-on-surface");
  });
});
