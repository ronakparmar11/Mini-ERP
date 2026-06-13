import { ArrowRight, Building2, ChevronRight, Truck, Warehouse } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Modal } from "@/components/common/Modal";
import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { InvoiceBillingPanel } from "@/features/invoices/InvoiceBillingPanel";
import { useManufacturingOrders } from "@/features/manufacturing/hooks";
import { useProducts } from "@/features/products/hooks";
import { usePurchaseOrders } from "@/features/purchase/hooks";
import { ConfirmationBanner } from "@/features/sales/ConfirmationBanner";
import { ConfirmationResultDialog } from "@/features/sales/ConfirmationResultDialog";
import { DeliverDialog } from "@/features/sales/DeliverDialog";
import { FulfillmentPanel } from "@/features/sales/FulfillmentPanel";
import { OrderLifecycle } from "@/features/sales/OrderLifecycle";
import {
  useCancelSalesOrder,
  useConfirmSalesOrder,
  useSalesOrder,
} from "@/features/sales/hooks";
import { SALES_STATUS_META, formatSoRef } from "@/features/sales/salesUtils";
import type { ConfirmationResult } from "@/types/sales";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatCurrency, formatDateTime, formatNumber } from "@/utils/format";

export function SalesOrderDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();

  const { data: order, isLoading, error, refetch } = useSalesOrder(id);
  const { data: products } = useProducts();
  const { data: allMos } = useManufacturingOrders();
  const { data: allPos } = usePurchaseOrders();

  const confirmMut = useConfirmSalesOrder(id);
  const cancelMut = useCancelSalesOrder(id);

  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showDeliver, setShowDeliver] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  // Orders auto-generated for (or otherwise linked to) this sales order.
  const linkedMos = useMemo(
    () => (allMos ?? []).filter((m) => m.source_sales_order_id === id && m.status !== "CANCELLED"),
    [allMos, id],
  );
  const linkedPos = useMemo(
    () => (allPos ?? []).filter((p) => p.source_sales_order_id === id && p.status !== "CANCELLED"),
    [allPos, id],
  );

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
  const canDeliver = order.status === "CONFIRMED" || order.status === "PARTIALLY_DELIVERED";
  const canCancel = order.status !== "DELIVERED" && order.status !== "CANCELLED";
  const showReservation = order.status !== "DRAFT" && order.status !== "CANCELLED";

  const onConfirm = async () => {
    try {
      const res = await confirmMut.mutateAsync();
      setConfirmResult(res);
      setShowResult(true);
      setBannerDismissed(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const onCancel = async () => {
    try {
      await cancelMut.mutateAsync();
      toast.success(`${formatSoRef(order.id)} cancelled`);
      setShowCancel(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-6 lg:p-8">
      {/* Breadcrumb + actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Link to="/sales" className="hover:text-primary">
            Sales
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-on-surface">{formatSoRef(order.id)}</span>
        </nav>
        <div className="flex items-center gap-2">
          {canCancel && (
            <Button variant="ghost" size="sm" className="text-error" onClick={() => setShowCancel(true)}>
              Cancel Order
            </Button>
          )}
          {canConfirm && (
            <Button size="sm" onClick={onConfirm} disabled={confirmMut.isPending}>
              {confirmMut.isPending ? "Confirming…" : "Confirm Order"}
            </Button>
          )}
          {canDeliver && (
            <Button size="sm" onClick={() => setShowDeliver(true)}>
              <Truck className="h-4 w-4" />
              Deliver
            </Button>
          )}
        </div>
      </div>

      {/* Persistent confirmation outcome (survives closing the result dialog) */}
      {confirmResult && !bannerDismissed && (
        <ConfirmationBanner result={confirmResult} onDismiss={() => setBannerDismissed(true)} />
      )}

      {/* Document card */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        {/* Header */}
        <div className="flex flex-col justify-between gap-6 border-b border-outline-variant p-6 md:flex-row md:items-center md:p-8">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-display-lg text-on-surface">{formatSoRef(order.id)}</h2>
              <StatusBadge meta={SALES_STATUS_META[order.status]} />
            </div>
            <p className="flex items-center gap-2 text-title-sm text-on-surface-variant">
              <Building2 className="h-5 w-5" />
              {order.customer_name}
            </p>
            {order.customer_address && (
              <p className="mt-1 text-body-sm text-on-surface-variant">{order.customer_address}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 md:border-none md:bg-transparent md:p-0 md:text-right">
            <Row label="Order Date" value={formatDateTime(order.creation_date)} />
            <Row label="Salesperson" value={order.salesperson ?? "—"} />
            <div className="flex justify-between gap-8 md:justify-end">
              <span className="text-body-sm text-on-surface-variant">Total Amount:</span>
              <span className="text-title-sm font-bold text-primary">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Lifecycle */}
        <div className="border-b border-outline-variant bg-surface-container-lowest p-6 md:p-8">
          <h3 className="mb-6 text-label-upper uppercase text-on-surface-variant">Order Lifecycle</h3>
          <OrderLifecycle status={order.status} />
        </div>

        {/* Reservation banner */}
        {showReservation && (
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-tertiary-fixed p-2 text-on-tertiary-fixed">
                <Warehouse className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-title-sm text-on-surface">Inventory Reserved</h4>
                <p className="text-body-sm text-on-surface-variant">
                  Stock is committed to this order until delivery.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/inventory")}
              className="flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
            >
              View Stock Moves
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest">
                <th className="px-6 py-3 text-label-upper uppercase text-on-surface-variant">Product</th>
                <th className="px-6 py-3 text-right text-label-upper uppercase text-on-surface-variant">Ordered</th>
                <th className="px-6 py-3 text-right text-label-upper uppercase text-on-surface-variant">Delivered</th>
                <th className="px-6 py-3 text-right text-label-upper uppercase text-on-surface-variant">Remaining</th>
                <th className="px-6 py-3 text-right text-label-upper uppercase text-on-surface-variant">Unit Price</th>
                <th className="px-6 py-3 text-right text-label-upper uppercase text-on-surface-variant">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-table-data text-on-surface">
              {order.lines.map((l) => (
                <tr key={l.id} className="transition-colors hover:bg-surface-container-low">
                  <td className="px-6 py-4 font-semibold text-on-surface">{productName(l.product_id)}</td>
                  <td className="px-6 py-4 text-right">{formatNumber(l.ordered_quantity)}</td>
                  <td className="px-6 py-4 text-right">{formatNumber(l.delivered_quantity)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={l.remaining_to_deliver > 0 ? "text-on-surface" : "text-tertiary-container"}>
                      {formatNumber(l.remaining_to_deliver)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">{formatCurrency(l.sales_price)}</td>
                  <td className="px-6 py-4 text-right font-semibold">{formatCurrency(l.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-outline-variant bg-surface-container-lowest">
              <tr>
                <td className="px-6 py-4" colSpan={4} />
                <td className="px-6 py-3 text-right text-body-sm text-on-surface-variant">Total:</td>
                <td className="px-6 py-3 text-right text-title-sm font-bold text-primary">
                  {formatCurrency(order.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Fulfillment & next steps */}
      <FulfillmentPanel
        order={order}
        linkedPurchaseOrders={linkedPos}
        linkedManufacturingOrders={linkedMos}
        canConfirm={canConfirm}
        canDeliver={canDeliver}
        confirmPending={confirmMut.isPending}
        onConfirm={onConfirm}
        onDeliver={() => setShowDeliver(true)}
      />

      {/* Invoice & billing (assisted Order-to-Cash) — only once fulfilled */}
      {order.status === "DELIVERED" && <InvoiceBillingPanel salesOrderId={order.id} />}

      {/* Dialogs */}
      <ConfirmationResultDialog open={showResult} onClose={() => setShowResult(false)} result={confirmResult} />
      <DeliverDialog open={showDeliver} onClose={() => setShowDeliver(false)} order={order} productName={productName} />
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel Sales Order"
        description={`This will cancel ${formatSoRef(order.id)} and release outstanding reservations.`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCancel(false)}>
              Keep Order
            </Button>
            <Button variant="destructive" size="sm" onClick={onCancel} disabled={cancelMut.isPending}>
              {cancelMut.isPending ? "Cancelling…" : "Cancel Order"}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-on-surface-variant">
          Auto-generated Purchase/Manufacturing orders are not unwound automatically and must be
          cancelled separately if needed.
        </p>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-8 md:justify-end">
      <span className="text-body-sm text-on-surface-variant">{label}:</span>
      <span className="text-body-sm font-semibold text-on-surface">{value}</span>
    </div>
  );
}
