import { CheckCircle2, Factory, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/common/Modal";
import type { ConfirmationResult } from "@/types/sales";

/**
 * Surfaces the backend ConfirmationResult after a sales order is confirmed:
 * the human-readable messages plus any auto-generated Purchase / Manufacturing
 * orders (the demand-driven procurement story).
 */
export function ConfirmationResultDialog({
  open,
  onClose,
  result,
}: {
  open: boolean;
  onClose: () => void;
  result: ConfirmationResult | null;
}) {
  const navigate = useNavigate();
  if (!result) return null;

  const { generated_purchase_order_ids: poIds, generated_manufacturing_order_ids: moIds, messages } = result;
  const hasProcurement = poIds.length > 0 || moIds.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Order Confirmed"
      description="Stock reserved and demand-driven procurement evaluated."
      footer={
        <Button onClick={onClose} size="sm">
          Done
        </Button>
      }
    >
      <div className="space-y-5">
        <ul className="space-y-2">
          {messages.length === 0 ? (
            <li className="text-body-sm text-on-surface-variant">Order confirmed successfully.</li>
          ) : (
            messages.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-on-surface">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-tertiary-container" />
                <span>{m}</span>
              </li>
            ))
          )}
        </ul>

        {hasProcurement && (
          <div className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
            <p className="text-label-upper uppercase text-on-surface-variant">Auto-generated documents</p>
            <div className="flex flex-wrap gap-2">
              {poIds.map((id) => (
                <button
                  key={`po-${id}`}
                  onClick={() => navigate("/purchase")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-tertiary-fixed-dim bg-[#f0fdf4] px-3 py-1 text-body-sm font-semibold text-tertiary-container hover:underline"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  PO-{id}
                </button>
              ))}
              {moIds.map((id) => (
                <button
                  key={`mo-${id}`}
                  onClick={() => navigate("/manufacturing")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary-fixed-dim bg-primary-fixed/40 px-3 py-1 text-body-sm font-semibold text-primary hover:underline"
                >
                  <Factory className="h-3.5 w-3.5" />
                  MO-{id}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
