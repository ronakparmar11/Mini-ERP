import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { InlineAlert } from "@/components/common/InlineAlert";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReceivePurchaseOrder } from "@/features/purchase/hooks";
import type { PurchaseOrder } from "@/types/purchase";
import { getFriendlyError } from "@/utils/apiError";
import { formatNumber } from "@/utils/format";

interface ReceiveDialogProps {
  open: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  productName: (id: number) => string;
}

export function ReceiveDialog({ open, onClose, order, productName }: ReceiveDialogProps) {
  const { t } = useTranslation();
  const receiveMut = useReceivePurchaseOrder(order.id);
  const pending = order.lines.filter((l) => l.remaining_to_receive > 0);
  const [qty, setQty] = useState<Record<number, string>>({});
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const seed: Record<number, string> = {};
      pending.forEach((l) => (seed[l.id] = String(l.remaining_to_receive)));
      setQty(seed);
      setAlert(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order.id]);

  const submit = async (receiveAll: boolean) => {
    try {
      if (receiveAll) {
        await receiveMut.mutateAsync({});
      } else {
        const lines = pending
          .map((l) => ({ line_id: l.id, quantity: Number(qty[l.id]) || 0 }))
          .filter((l) => l.quantity > 0);
        if (lines.length === 0) {
          toast.error("Enter a quantity greater than zero for at least one line.");
          return;
        }
        const over = pending.find((l) => (Number(qty[l.id]) || 0) > l.remaining_to_receive + 1e-9);
        if (over) {
          toast.error(`Cannot receive more than the remaining ${formatNumber(over.remaining_to_receive)} on a line.`);
          return;
        }
        await receiveMut.mutateAsync({ lines });
      }
      toast.success("Receipt recorded");
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
      title={t("purchase.receiveGoods")}
      description={t("purchase.receiveGoodsDesc")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="secondary" size="sm" onClick={() => submit(true)} disabled={receiveMut.isPending}>
            {t("purchase.receiveAll")}
          </Button>
          <Button size="sm" onClick={() => submit(false)} disabled={receiveMut.isPending}>
            {receiveMut.isPending ? t("purchase.receiving") : t("purchase.receiveSelected")}
          </Button>
        </>
      }
    >
      {alert && <InlineAlert message={alert} className="mb-3" />}
      {pending.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">{t("purchase.nothingToReceive")}</p>
      ) : (
        <div className="space-y-3">
          {pending.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant p-3">
              <div className="min-w-0">
                <div className="truncate text-body-md font-medium text-on-surface">{productName(l.product_id)}</div>
                <div className="text-[11px] text-on-surface-variant">
                  {t("purchase.remaining")} {formatNumber(l.remaining_to_receive)} / {formatNumber(l.ordered_quantity)}
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
