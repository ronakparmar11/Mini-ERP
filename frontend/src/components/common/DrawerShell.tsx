import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";

import { cn } from "@/utils/cn";

interface DrawerShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Width cap of the panel (defaults to a standard side drawer). */
  widthClassName?: string;
  /** Accessible label for the dialog region. */
  label?: string;
}

/**
 * Shared side-drawer chrome: a full-viewport overlay + a right-anchored panel,
 * rendered through a portal on document.body so it is NEVER constrained by the
 * layout (sidebar/topbar/content column) — the overlay always covers the whole
 * screen. Every create/edit/detail drawer reuses this so overlay behaviour is
 * identical everywhere.
 *
 * Layering: overlay z-40, panel z-50.
 */
export function DrawerShell({
  open,
  onClose,
  children,
  widthClassName = "max-w-md",
  label,
}: DrawerShellProps) {
  const location = useLocation();

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Safety net: never let an overlay survive a route change. Remember the path
  // the drawer opened on; if navigation moves away while open, close it.
  const openedPath = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      openedPath.current = null;
      return;
    }
    if (openedPath.current === null) {
      openedPath.current = location.pathname;
    } else if (location.pathname !== openedPath.current) {
      onClose();
    }
  }, [open, location.pathname, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      {/* Overlay — full viewport, above the app shell (sidebar included). */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Panel — right-anchored, full height, above the overlay. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-screen w-full animate-fade-in flex-col border-l border-outline-variant bg-surface-container-lowest shadow-2xl",
          widthClassName,
        )}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
