import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClass = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" } as const;

/** Lightweight centered modal with backdrop + Esc-to-close. Reused for dialogs. */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[90vh] w-full animate-fade-in flex-col rounded-xl border border-outline-variant bg-surface-container-lowest shadow-2xl",
          sizeClass[size],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-outline-variant p-4">
          <div>
            <h3 className="text-title-sm text-on-surface">{title}</h3>
            {description && <p className="mt-0.5 text-body-sm text-on-surface-variant">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-outline-variant p-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
