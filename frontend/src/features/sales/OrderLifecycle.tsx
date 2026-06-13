import { Check, XCircle } from "lucide-react";

import { SALES_LIFECYCLE, lifecycleIndex } from "@/features/sales/salesUtils";
import type { SalesOrderStatus } from "@/types/sales";
import { cn } from "@/utils/cn";

/** Horizontal lifecycle tracker (Draft → Confirmed → Delivering → Delivered). */
export function OrderLifecycle({ status }: { status: SalesOrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-error-container bg-error-container/30 px-4 py-3 text-on-error-container">
        <XCircle className="h-5 w-5" />
        <span className="text-body-md font-semibold">This order was cancelled.</span>
      </div>
    );
  }

  const current = lifecycleIndex(status);
  const lastIndex = SALES_LIFECYCLE.length - 1;
  const progressPct = current <= 0 ? 0 : (current / lastIndex) * 100;

  return (
    <div className="relative mx-auto flex w-full max-w-3xl items-center justify-between">
      <div className="absolute left-0 top-4 z-0 h-1 w-full -translate-y-1/2 rounded-full bg-surface-variant" />
      <div
        className="absolute left-0 top-4 z-0 h-1 -translate-y-1/2 rounded-full bg-primary transition-all"
        style={{ width: `${progressPct}%` }}
      />
      {SALES_LIFECYCLE.map((step, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={step.status} className={cn("relative z-10 flex w-24 flex-col items-center gap-2")}>
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-4 border-surface shadow-sm",
                done && "bg-primary text-on-primary",
                active && "bg-surface border-2 border-primary text-primary",
                !done && !active && "bg-surface border-2 border-outline-variant text-outline",
              )}
            >
              {done ? <Check className="h-4 w-4" /> : <span className="text-[12px] font-bold">{idx + 1}</span>}
            </div>
            <span
              className={cn(
                "text-center text-label-upper uppercase",
                active ? "font-bold text-primary" : done ? "text-on-surface" : "text-on-surface-variant",
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
