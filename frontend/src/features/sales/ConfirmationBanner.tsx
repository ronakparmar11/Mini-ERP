import { CheckCircle2, Factory, ShoppingCart, X } from "lucide-react";
import { Link } from "react-router-dom";

import type { ConfirmationResult } from "@/types/sales";

/**
 * Dismissible banner that keeps the confirmation outcome (reservation summary +
 * auto-generated PO/MO documents) visible on the order after the result dialog
 * is closed. Persists for the lifetime of the page via parent state — no global
 * store. Mirrors the data shown in ConfirmationResultDialog.
 */
export function ConfirmationBanner({
  result,
  onDismiss,
}: {
  result: ConfirmationResult;
  onDismiss: () => void;
}) {
  const { generated_purchase_order_ids: poIds, generated_manufacturing_order_ids: moIds, messages } = result;
  const hasProcurement = poIds.length > 0 || moIds.length > 0;

  return (
    <div className="relative flex gap-3 rounded-xl border border-tertiary-fixed-dim bg-[#f0fdf4] p-4 pr-10 shadow-sm">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-tertiary-container" />
      <div className="space-y-2">
        <h4 className="text-title-sm text-on-surface">Order confirmed</h4>
        <ul className="space-y-1 text-body-sm text-on-surface">
          {messages.length === 0 ? (
            <li>Order confirmed successfully.</li>
          ) : (
            messages.map((m, i) => <li key={i}>{m}</li>)
          )}
        </ul>
        {hasProcurement && (
          <div className="flex flex-wrap gap-2 pt-1">
            {moIds.map((id) => (
              <Link
                key={`mo-${id}`}
                to={`/manufacturing/${id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary-fixed-dim bg-primary-fixed/40 px-3 py-1 text-body-sm font-semibold text-primary hover:underline"
              >
                <Factory className="h-3.5 w-3.5" />
                MO-{id}
              </Link>
            ))}
            {poIds.map((id) => (
              <Link
                key={`po-${id}`}
                to={`/purchase-orders/${id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-tertiary-fixed-dim bg-white px-3 py-1 text-body-sm font-semibold text-tertiary-container hover:underline"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                PO-{id}
              </Link>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded p-1 text-on-surface-variant hover:bg-black/5"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
