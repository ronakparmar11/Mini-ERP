import { Check, Clock, Timer } from "lucide-react";

import type { ManufacturingOrder, MOOperation } from "@/types/manufacturing";
import { cn } from "@/utils/cn";
import { formatNumber } from "@/utils/format";

type OpState = "done" | "active" | "pending";

function operationState(op: MOOperation, status: ManufacturingOrder["status"]): OpState {
  if (op.actual_duration != null || status === "DONE") return "done";
  if (status === "IN_PROGRESS") return "active";
  return "pending";
}

/** Read-only routing & operations timeline (mirrors Stitch screen 6). */
export function OperationsTimeline({ order }: { order: ManufacturingOrder }) {
  if (order.operations.length === 0) {
    return <p className="p-4 text-body-sm text-on-surface-variant">No operations defined for this order.</p>;
  }

  return (
    <div className="relative p-4 pl-5">
      <div className="absolute bottom-4 left-[27px] top-8 z-0 w-px bg-outline-variant" />
      <ol className="relative z-10 space-y-4">
        {order.operations.map((op) => {
          const state = operationState(op, order.status);
          return (
            <li key={op.id} className="flex gap-4">
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                  state === "done" && "border-tertiary bg-tertiary-container text-on-tertiary-container",
                  state === "active" && "border-primary bg-primary text-on-primary",
                  state === "pending" && "border-outline bg-surface text-outline",
                )}
              >
                {state === "done" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <div
                className={cn(
                  "flex-1 rounded border p-3",
                  state === "active" ? "border-primary bg-surface" : "border-outline-variant bg-surface-container-low",
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <h5 className={cn("text-body-sm font-semibold", state === "active" ? "text-primary" : "text-on-surface")}>
                    {op.work_center}
                  </h5>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[11px] font-semibold",
                      state === "done" && "border-tertiary/20 bg-tertiary-container/30 text-tertiary",
                      state === "active" && "border-primary/20 bg-primary-container/20 text-primary",
                      state === "pending" && "border-outline-variant bg-surface-container text-on-surface-variant",
                    )}
                  >
                    {state === "done" ? "Done" : state === "active" ? "Active" : "Pending"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-table-data text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Expected: {formatNumber(op.expected_duration)}m
                  </span>
                  {op.actual_duration != null && (
                    <span className="flex items-center gap-1 text-tertiary">
                      <Timer className="h-3.5 w-3.5" /> Actual: {formatNumber(op.actual_duration)}m
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
