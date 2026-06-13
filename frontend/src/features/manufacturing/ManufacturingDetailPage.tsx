import { ChevronRight, ListChecks, Play, Timer } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Modal } from "@/components/common/Modal";
import { SectionCard } from "@/components/common/SectionCard";
import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/features/products/hooks";
import { OperationsTimeline } from "@/features/manufacturing/OperationsTimeline";
import { ProduceDialog } from "@/features/manufacturing/ProduceDialog";
import {
  useCancelMO,
  useConfirmMO,
  useManufacturingOrder,
  useStartMO,
} from "@/features/manufacturing/hooks";
import {
  MANUFACTURING_STATUS_META,
  componentConsumptionStatus,
  formatMoRef,
} from "@/features/manufacturing/manufacturingUtils";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatDateTime, formatNumber } from "@/utils/format";

export function ManufacturingDetailPage() {
  const id = Number(useParams().id);

  const { data: order, isLoading, error, refetch } = useManufacturingOrder(id);
  const { data: products } = useProducts();

  const confirmMut = useConfirmMO(id);
  const startMut = useStartMO(id);
  const cancelMut = useCancelMO(id);

  const [showProduce, setShowProduce] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const productName = useMemo(() => {
    const map = new Map((products ?? []).map((p) => [p.id, p.name]));
    return (pid: number) => map.get(pid) ?? `Product #${pid}`;
  }, [products]);

  if (isLoading) return <LoadingState className="py-24" />;
  if (error || !order)
    return (
      <div className="p-8">
        <ErrorState error={error ?? new Error("Order not found")} onRetry={() => refetch()} />
      </div>
    );

  const runAction = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast.success(message);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const canConfirm = order.status === "DRAFT";
  const canStart = order.status === "CONFIRMED";
  const canProduce = order.status === "IN_PROGRESS";
  const canCancel = order.status === "DRAFT" || order.status === "CONFIRMED";

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-6 lg:p-8">
      {/* Breadcrumb + actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Link to="/manufacturing" className="hover:text-primary">
            Manufacturing
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-on-surface">{formatMoRef(order.id)}</span>
        </nav>
        <div className="flex items-center gap-2">
          {canCancel && (
            <Button variant="ghost" size="sm" className="text-error" onClick={() => setShowCancel(true)}>
              Cancel
            </Button>
          )}
          {canConfirm && (
            <Button size="sm" disabled={confirmMut.isPending} onClick={() => runAction(() => confirmMut.mutateAsync(), `${formatMoRef(order.id)} confirmed`)}>
              {confirmMut.isPending ? "Confirming…" : "Confirm"}
            </Button>
          )}
          {canStart && (
            <Button size="sm" disabled={startMut.isPending} onClick={() => runAction(() => startMut.mutateAsync(), "Production started")}>
              <Play className="h-4 w-4" />
              {startMut.isPending ? "Starting…" : "Start Production"}
            </Button>
          )}
          {canProduce && (
            <Button size="sm" onClick={() => setShowProduce(true)}>
              <Timer className="h-4 w-4" />
              Produce
            </Button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm md:p-8">
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-display-lg text-on-surface">{formatMoRef(order.id)}</h2>
          <StatusBadge meta={MANUFACTURING_STATUS_META[order.status]} />
        </div>
        <p className="text-title-sm text-on-surface-variant">{productName(order.finished_product_id)}</p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Info label="Quantity" value={`${formatNumber(order.quantity_to_produce)} units`} />
          <Info label="Bill of Materials" value={order.bom_id != null ? `#${order.bom_id}` : "—"} />
          <Info label="Assignee" value={order.assignee ?? "Unassigned"} />
          <Info label="Schedule" value={order.schedule_date ? formatDateTime(order.schedule_date) : "No deadline"} />
          <Info
            label="Source"
            value={order.source_sales_order_id != null ? `SO-${order.source_sales_order_id}` : "Manual"}
          />
        </div>
      </div>

      {/* Components consumed */}
      <SectionCard title="Bill of Materials Consumed" icon={ListChecks} bodyClassName="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-label-upper uppercase text-on-surface-variant">
              <th className="px-4 py-3">Component</th>
              <th className="px-4 py-3 text-right">Required</th>
              <th className="px-4 py-3 text-right">Consumed</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant text-table-data text-on-surface">
            {order.components.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-on-surface-variant">
                  No components on this order.
                </td>
              </tr>
            ) : (
              order.components.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-surface-container-low/50">
                  <td className="px-4 py-2.5 font-medium">{productName(c.component_product_id)}</td>
                  <td className="px-4 py-2.5 text-right">{formatNumber(c.quantity_required)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatNumber(c.quantity_consumed)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex justify-center">
                      <StatusBadge meta={componentConsumptionStatus(c)} />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </SectionCard>

      {/* Operations */}
      <SectionCard title="Routing & Operations" icon={Timer} bodyClassName="p-0">
        <OperationsTimeline order={order} />
      </SectionCard>

      {/* Dialogs */}
      <ProduceDialog open={showProduce} onClose={() => setShowProduce(false)} order={order} productName={productName} />
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel Manufacturing Order"
        description={`This will cancel ${formatMoRef(order.id)}.`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCancel(false)}>
              Keep Order
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelMut.isPending}
              onClick={async () => {
                await runAction(() => cancelMut.mutateAsync(), `${formatMoRef(order.id)} cancelled`);
                setShowCancel(false);
              }}
            >
              {cancelMut.isPending ? "Cancelling…" : "Cancel Order"}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-on-surface-variant">
          Components already consumed by production are not returned automatically.
        </p>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-label-upper uppercase text-on-surface-variant">{label}</div>
      <div className="mt-0.5 text-body-md font-medium text-on-surface">{value}</div>
    </div>
  );
}
