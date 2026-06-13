import { Building2, ChevronRight, PackageCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Modal } from "@/components/common/Modal";
import { SectionCard } from "@/components/common/SectionCard";
import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/features/products/hooks";
import { ReceiveDialog } from "@/features/purchase/ReceiveDialog";
import {
  useCancelPurchaseOrder,
  useConfirmPurchaseOrder,
  usePurchaseOrder,
} from "@/features/purchase/hooks";
import { PURCHASE_STATUS_META, formatPoRef } from "@/features/purchase/purchaseUtils";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatCurrency, formatDateTime, formatNumber } from "@/utils/format";

export function PurchaseOrderDetailPage() {
  const id = Number(useParams().id);
  const { data: order, isLoading, error, refetch } = usePurchaseOrder(id);
  const { data: products } = useProducts();

  const confirmMut = useConfirmPurchaseOrder(id);
  const cancelMut = useCancelPurchaseOrder(id);

  const [showReceive, setShowReceive] = useState(false);
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

  const canConfirm = order.status === "DRAFT";
  const canReceive = order.status === "CONFIRMED" || order.status === "PARTIALLY_RECEIVED";
  const canCancel = order.status !== "RECEIVED" && order.status !== "CANCELLED";

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Link to="/purchase-orders" className="hover:text-primary">Purchasing</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-on-surface">{formatPoRef(order.id)}</span>
        </nav>
        <div className="flex items-center gap-2">
          {canCancel && (
            <Button variant="ghost" size="sm" className="text-error" onClick={() => setShowCancel(true)}>Cancel</Button>
          )}
          {canConfirm && (
            <Button size="sm" disabled={confirmMut.isPending} onClick={() => run(() => confirmMut.mutateAsync(), `${formatPoRef(order.id)} confirmed`)}>
              {confirmMut.isPending ? "Confirming…" : "Confirm"}
            </Button>
          )}
          {canReceive && (
            <Button size="sm" onClick={() => setShowReceive(true)}>
              <PackageCheck className="h-4 w-4" />
              Receive
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm md:p-8">
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-display-lg text-on-surface">{formatPoRef(order.id)}</h2>
          <StatusBadge meta={PURCHASE_STATUS_META[order.status]} />
        </div>
        <p className="flex items-center gap-2 text-title-sm text-on-surface-variant">
          <Building2 className="h-5 w-5" />
          {order.vendor}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Info label="Creation Date" value={formatDateTime(order.creation_date)} />
          <Info label="Responsible" value={order.responsible_person ?? "—"} />
          <Info label="Source" value={order.source_sales_order_id != null ? `SO-${order.source_sales_order_id}` : "Manual"} />
          <Info label="Total" value={formatCurrency(order.total_amount)} />
        </div>
      </div>

      <SectionCard title="Order Lines" icon={PackageCheck} bodyClassName="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-label-upper uppercase text-on-surface-variant">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Ordered</th>
              <th className="px-4 py-3 text-right">Received</th>
              <th className="px-4 py-3 text-right">Remaining</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant text-table-data text-on-surface">
            {order.lines.map((l) => (
              <tr key={l.id} className="transition-colors hover:bg-surface-container-low/50">
                <td className="px-4 py-2.5 font-medium">{productName(l.product_id)}</td>
                <td className="px-4 py-2.5 text-right">{formatNumber(l.ordered_quantity)}</td>
                <td className="px-4 py-2.5 text-right">{formatNumber(l.received_quantity)}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={l.remaining_to_receive > 0 ? "text-on-surface" : "text-tertiary-container"}>
                    {formatNumber(l.remaining_to_receive)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">{formatCurrency(l.cost_price)}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(l.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-outline-variant bg-surface-container-lowest">
            <tr>
              <td className="px-4 py-3" colSpan={5} />
              <td className="px-4 py-3 text-right text-title-sm font-bold text-primary">{formatCurrency(order.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </SectionCard>

      <ReceiveDialog open={showReceive} onClose={() => setShowReceive(false)} order={order} productName={productName} />
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel Purchase Order"
        description={`This will cancel ${formatPoRef(order.id)}.`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCancel(false)}>Keep Order</Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelMut.isPending}
              onClick={async () => {
                await run(() => cancelMut.mutateAsync(), `${formatPoRef(order.id)} cancelled`);
                setShowCancel(false);
              }}
            >
              {cancelMut.isPending ? "Cancelling…" : "Cancel Order"}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-on-surface-variant">Already-received goods remain in stock.</p>
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
