import { useEffect, useState } from "react";
import { toast } from "sonner";

import { InlineAlert } from "@/components/common/InlineAlert";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeliverSalesOrder } from "@/features/sales/hooks";
import type { SalesOrder } from "@/types/sales";
import { getFriendlyError } from "@/utils/apiError";
import { formatNumber } from "@/utils/format";

interface DeliverDialogProps {
  open: boolean;
  onClose: () => void;
  order: SalesOrder;
  productName: (id: number) => string;
}

/** Per-line delivery dialog. Defaults each line to its remaining quantity. */
export function DeliverDialog({ open, onClose, order, productName }: DeliverDialogProps) {
  const deliverMut = useDeliverSalesOrder(order.id);
  const deliverableLines = order.lines.filter((l) => l.remaining_to_deliver > 0);
  const [qty, setQty] = useState<Record<number, string>>({});
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const seed: Record<number, string> = {};
      deliverableLines.forEach((l) => (seed[l.id] = String(l.remaining_to_deliver)));
      setQty(seed);
      setAlert(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order.id]);

  const submit = async (deliverAll: boolean) => {
    try {
      if (deliverAll) {
        await deliverMut.mutateAsync({}); // empty body = deliver all remaining
      } else {
        const lines = deliverableLines
          .map((l) => ({ line_id: l.id, quantity: Number(qty[l.id]) || 0 }))
          .filter((l) => l.quantity > 0);
        if (lines.length === 0) {
          toast.error("Enter a quantity greater than zero for at least one line.");
          return;
        }
        // Client guard for a nicer message; the backend remains the source of truth.
        const over = deliverableLines.find(
          (l) => (Number(qty[l.id]) || 0) > l.remaining_to_deliver + 1e-9,
        );
        if (over) {
          toast.error(
            `Cannot deliver more than the remaining ${formatNumber(over.remaining_to_deliver)} on a line.`,
          );
          return;
        }
        await deliverMut.mutateAsync({ lines });
      }
      toast.success("Delivery recorded");
      onClose();
    } catch (err) {
      const msg = getFriendlyError(err);
      setAlert(msg);
      toast.error(msg);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Deliver Order"
      description="Delivering reduces reserved and on-hand stock."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => submit(true)}
            disabled={deliverMut.isPending}
          >
            Deliver all remaining
          </Button>
          <Button size="sm" onClick={() => submit(false)} disabled={deliverMut.isPending}>
            {deliverMut.isPending ? "Delivering…" : "Deliver selected"}
          </Button>
        </>
      }
    >
      {alert && <InlineAlert message={alert} className="mb-3" />}
      {deliverableLines.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Nothing left to deliver on this order.</p>
      ) : (
        <div className="space-y-3">
          {deliverableLines.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-body-md font-medium text-on-surface">
                  {productName(l.product_id)}
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  Remaining {formatNumber(l.remaining_to_deliver)} of {formatNumber(l.ordered_quantity)}
                </div>
              </div>
              <Input
                type="number"
                min="0"
                step="1"
                value={qty[l.id] ?? ""}
                onChange={(e) => setQty((prev) => ({ ...prev, [l.id]: e.target.value }))}
                className="w-28 py-2 text-right"
              />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
