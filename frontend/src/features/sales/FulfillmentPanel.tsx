import { ArrowRight, CheckCircle2, Factory, PackageCheck, ShoppingCart, Truck } from "lucide-react";
import { Link } from "react-router-dom";

import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { MANUFACTURING_STATUS_META } from "@/features/manufacturing/manufacturingUtils";
import { PURCHASE_STATUS_META } from "@/features/purchase/purchaseUtils";
import type { ManufacturingOrder } from "@/types/manufacturing";
import type { PurchaseOrder } from "@/types/purchase";
import type { SalesOrder } from "@/types/sales";
import { formatNumber } from "@/utils/format";

const units = (n: number) => `${formatNumber(n)} unit${Math.abs(n) === 1 ? "" : "s"}`;

interface FulfillmentPanelProps {
  order: SalesOrder;
  linkedPurchaseOrders: PurchaseOrder[];
  linkedManufacturingOrders: ManufacturingOrder[];
  canConfirm: boolean;
  canDeliver: boolean;
  confirmPending: boolean;
  onConfirm: () => void;
  onDeliver: () => void;
}

/**
 * "Fulfillment & Next Steps" — tells the user, in plain language, what to do
 * next with this order based on its status and how much stock is reserved vs.
 * still being procured. Uses the line-level reserved_quantity already returned
 * by the backend; no new endpoints.
 */
export function FulfillmentPanel({
  order,
  linkedPurchaseOrders,
  linkedManufacturingOrders,
  canConfirm,
  canDeliver,
  confirmPending,
  onConfirm,
  onDeliver,
}: FulfillmentPanelProps) {
  const totals = order.lines.reduce(
    (acc, l) => {
      const outstanding = l.remaining_to_deliver;
      const reserved = Math.min(l.reserved_quantity, outstanding);
      const awaiting = Math.max(0, outstanding - reserved);
      acc.reserved += reserved;
      acc.awaiting += awaiting;
      return acc;
    },
    { reserved: 0, awaiting: 0 },
  );

  const fullyReserved = totals.awaiting <= 1e-9;

  let body: React.ReactNode;

  if (order.status === "DRAFT") {
    body = (
      <div className="p-4">
        <Guidance
          tone="info"
          title="Confirm this order to reserve stock."
          detail="Confirming reserves available inventory and auto-raises Purchase/Manufacturing orders for any shortage."
        >
          {canConfirm && (
            <Button size="sm" onClick={onConfirm} disabled={confirmPending}>
              {confirmPending ? "Confirming…" : "Confirm Order"}
            </Button>
          )}
        </Guidance>
      </div>
    );
  } else if (order.status === "DELIVERED") {
    body = (
      <div className="p-4">
        <Guidance
          tone="success"
          icon={PackageCheck}
          title="This order has been fully delivered."
          detail="No further action is required."
        />
      </div>
    );
  } else if (order.status === "CANCELLED") {
    body = (
      <div className="p-4">
        <Guidance
          tone="neutral"
          title="This order was cancelled."
          detail="Any auto-generated Purchase/Manufacturing orders must be cancelled separately if no longer needed."
        />
      </div>
    );
  } else if (fullyReserved) {
    body = (
      <div className="p-4">
        <Guidance
          tone="success"
          icon={CheckCircle2}
          title="Inventory is ready. Proceed to delivery."
          detail={`${units(totals.reserved)} reserved and ready to ship.`}
        >
          {canDeliver && (
            <Button size="sm" onClick={onDeliver}>
              <Truck className="h-4 w-4" />
              Deliver
            </Button>
          )}
        </Guidance>
      </div>
    );
  } else {
    // Partially reserved — some quantity is still being procured/produced.
    body = (
      <div className="space-y-4 p-4">
        <Guidance
          tone="warning"
          title={`${units(totals.reserved)} reserved. ${units(totals.awaiting)} awaiting procurement.`}
          detail="Part of this order is covered by stock; the rest is being supplied by the linked orders below."
        />

        {(linkedPurchaseOrders.length > 0 || linkedManufacturingOrders.length > 0) && (
          <div className="space-y-2">
            <p className="text-label-upper uppercase text-on-surface-variant">Linked orders</p>
            <div className="flex flex-wrap gap-2">
              {linkedManufacturingOrders.map((mo) => (
                <Link
                  key={`mo-${mo.id}`}
                  to={`/manufacturing/${mo.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary-fixed-dim bg-primary-fixed/40 px-3 py-1 text-body-sm font-semibold text-primary hover:underline"
                >
                  <Factory className="h-3.5 w-3.5" />
                  Open MO-{mo.id}
                  <StatusBadge meta={MANUFACTURING_STATUS_META[mo.status]} className="ml-1" />
                </Link>
              ))}
              {linkedPurchaseOrders.map((po) => (
                <Link
                  key={`po-${po.id}`}
                  to={`/purchase-orders/${po.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-tertiary-fixed-dim bg-[#f0fdf4] px-3 py-1 text-body-sm font-semibold text-tertiary-container hover:underline"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Open PO-{po.id}
                  <StatusBadge meta={PURCHASE_STATUS_META[po.status]} className="ml-1" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {canDeliver && (
          <Button size="sm" variant="secondary" onClick={onDeliver}>
            <Truck className="h-4 w-4" />
            Deliver reserved quantity
          </Button>
        )}
      </div>
    );
  }

  return <SectionCard title="Fulfillment & Next Steps">{body}</SectionCard>;
}

const toneRing: Record<string, string> = {
  info: "bg-secondary-container text-primary",
  success: "bg-tertiary-fixed text-on-tertiary-fixed",
  warning: "bg-[#fffbeb] text-[#b45309]",
  neutral: "bg-surface-container text-on-surface-variant",
};

function Guidance({
  tone,
  icon: Icon = ArrowRight,
  title,
  detail,
  children,
}: {
  tone: keyof typeof toneRing;
  icon?: typeof ArrowRight;
  title: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${toneRing[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-title-sm text-on-surface">{title}</h4>
          {detail && <p className="text-body-sm text-on-surface-variant">{detail}</p>}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
