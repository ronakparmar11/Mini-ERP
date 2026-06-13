import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { DrawerShell } from "@/components/common/DrawerShell";
import { Modal } from "@/components/common/Modal";
import { ConfirmationResultDialog } from "@/features/sales/ConfirmationResultDialog";

function withRouter(ui: React.ReactNode, initialEntry = "/start") {
  return <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>;
}

const BACKDROP = '[class*="backdrop-blur"]';

describe("Modal overlay behaviour", () => {
  it("renders content above the backdrop with the correct z-index layering", () => {
    const { container } = render(
      withRouter(<Modal open onClose={() => {}} title="Hello">Body</Modal>),
    );
    const dialog = screen.getByRole("dialog");
    const backdrop = container.querySelector(BACKDROP);
    expect(dialog).toBeInTheDocument();
    expect(backdrop).not.toBeNull();
    // Overlay z-40, content z-50 (content always paints above the backdrop).
    expect(backdrop?.className).toContain("z-40");
    expect(dialog.className).toContain("z-50");
  });

  it("closing the dialog removes the overlay entirely (no orphaned backdrop)", () => {
    function Harness({ open }: { open: boolean }) {
      return withRouter(<Modal open={open} onClose={() => {}} title="Hello">Body</Modal>);
    }
    const { container, rerender } = render(<Harness open />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(container.querySelector(BACKDROP)).not.toBeNull();

    rerender(<Harness open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelector(BACKDROP)).toBeNull();
  });

  it("clears transient overlay state on a route change", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <Modal open={open} onClose={() => setOpen(false)} title="Hello">Body</Modal>
          <RouteChanger />
        </>
      );
    }
    function RouteChanger() {
      const navigate = useNavigate();
      return <button onClick={() => navigate("/elsewhere")}>navigate</button>;
    }

    const { container } = render(withRouter(<Harness />));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByText("navigate"));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelector(BACKDROP)).toBeNull();
  });
});

describe("DrawerShell portal + full-viewport overlay", () => {
  it("renders into document.body (escaping the layout) with a full-viewport overlay", () => {
    render(
      withRouter(
        <div id="layout">
          <DrawerShell open onClose={() => {}} label="Test Drawer">
            <p>Drawer body</p>
          </DrawerShell>
        </div>,
      ),
    );
    const overlay = document.body.querySelector('[class*="backdrop-blur"]') as HTMLElement;
    expect(overlay).not.toBeNull();
    // Full-viewport overlay, above the app shell.
    expect(overlay.className).toContain("fixed");
    expect(overlay.className).toContain("inset-0");
    expect(overlay.className).toContain("z-40");
    // Portaled to body, NOT nested inside the #layout subtree.
    expect(document.getElementById("layout")?.contains(overlay)).toBe(false);

    const panel = screen.getByRole("dialog");
    expect(panel.className).toContain("z-50");
    expect(panel.className).toContain("right-0");
    expect(panel.className).toContain("h-screen");
  });

  it("renders nothing when closed (no orphaned overlay in body)", () => {
    render(withRouter(<DrawerShell open={false} onClose={() => {}}><p>x</p></DrawerShell>));
    expect(document.body.querySelector('[class*="backdrop-blur"]')).toBeNull();
  });
});

describe("ConfirmationResultDialog guards", () => {
  it("renders nothing (no overlay) when open but data is missing", () => {
    const { container } = render(
      withRouter(<ConfirmationResultDialog open onClose={vi.fn()} result={null} />),
    );
    // open === true AND result === null must NOT leave an orphaned backdrop.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelector(BACKDROP)).toBeNull();
  });

  it("renders the dialog with content when data is present", () => {
    const result = {
      sales_order: { id: 3 } as never,
      generated_purchase_order_ids: [1],
      generated_manufacturing_order_ids: [],
      messages: ["Reserved 2 units."],
    };
    render(withRouter(<ConfirmationResultDialog open onClose={vi.fn()} result={result} />));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Reserved 2 units.")).toBeInTheDocument();
  });
});
