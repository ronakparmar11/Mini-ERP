import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { InlineAlert } from "@/components/common/InlineAlert";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProduceMO } from "@/features/manufacturing/hooks";
import type { ManufacturingOrder } from "@/types/manufacturing";
import { getFriendlyError } from "@/utils/apiError";
import { formatNumber } from "@/utils/format";

interface ProduceDialogProps {
  open: boolean;
  onClose: () => void;
  order: ManufacturingOrder;
  productName: (id: number) => string;
}

export function ProduceDialog({ open, onClose, order, productName }: ProduceDialogProps) {
  const { t } = useTranslation();
  const produceMut = useProduceMO(order.id);
  const [actuals, setActuals] = useState<Record<number, string>>({});
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const seed: Record<number, string> = {};
      order.operations.forEach((o) => {
        seed[o.id] = String(o.actual_duration ?? o.expected_duration);
      });
      setActuals(seed);
      setAlert(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order.id]);

  const submit = async () => {
    const operations = order.operations.map((o) => ({
      operation_id: o.id,
      actual_duration: Number(actuals[o.id]) || 0,
    }));
    try {
      await produceMut.mutateAsync(operations.length > 0 ? { operations } : {});
      toast.success(`Produced ${formatNumber(order.quantity_to_produce)} × ${productName(order.finished_product_id)}`);
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
      title={t("manufacturing.produceOrder")}
      description={t("manufacturing.produceOrderDesc")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={submit} disabled={produceMut.isPending}>
            {produceMut.isPending ? t("manufacturing.producing") : t("manufacturing.confirmProduction")}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {alert && <InlineAlert message={alert} />}
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface">
          Producing <span className="font-semibold">{formatNumber(order.quantity_to_produce)}</span> ×{" "}
          <span className="font-semibold">{productName(order.finished_product_id)}</span> will consume the
          components below from stock. Any shortage will be rejected by the backend.
        </div>

        {order.components.length > 0 && (
          <div>
            <p className="mb-2 text-label-upper uppercase text-on-surface-variant">{t("manufacturing.componentsToProduce")}</p>
            <ul className="space-y-1 text-body-sm text-on-surface">
              {order.components.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{productName(c.component_product_id)}</span>
                  <span className="font-medium">{formatNumber(c.quantity_required)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {order.operations.length > 0 && (
          <div>
            <p className="mb-2 text-label-upper uppercase text-on-surface-variant">{t("manufacturing.actualDurations")}</p>
            <div className="space-y-2">
              {order.operations.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-body-md text-on-surface">{o.work_center}</div>
                    <div className="text-[11px] text-on-surface-variant">
                      {t("manufacturing.expectedMin", { n: formatNumber(o.expected_duration) })}
                    </div>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={actuals[o.id] ?? ""}
                    onChange={(e) => setActuals((prev) => ({ ...prev, [o.id]: e.target.value }))}
                    className="w-28 py-2 text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
