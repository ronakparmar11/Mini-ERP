import { AlertTriangle, Cog, ShoppingCart, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/common/Badge";
import type { BadgeProps } from "@/components/common/Badge";
import { SectionCard } from "@/components/common/SectionCard";
import {
  useLowStock,
  usePendingManufacturing,
  usePendingPurchases,
} from "@/features/dashboard/hooks";
import { useSalesOrders } from "@/features/sales/hooks";
import { formatNumber } from "@/utils/format";

interface ActionItem {
  key: string;
  label: string;
  sublabel?: string;
  to: string;
}

/**
 * Action Center — opens the dashboard with what needs attention, not passive
 * KPIs. Each card is a prioritized worklist whose rows link straight to the
 * record. Built entirely from existing dashboard + list endpoints.
 */
export function ActionCenter() {
  const pendingPurchases = usePendingPurchases();
  const pendingMfg = usePendingManufacturing();
  const lowStock = useLowStock();
  const sales = useSalesOrders();

  // Needs Procurement — open POs + MOs not yet in production.
  const needsProcurement = useMemo<ActionItem[]>(() => {
    const pos = (pendingPurchases.data ?? []).map((p) => ({
      key: `po-${p.id}`,
      label: p.reference,
      sublabel: p.status.replace(/_/g, " "),
      to: `/purchase-orders/${p.id}`,
    }));
    const mos = (pendingMfg.data ?? [])
      .filter((m) => m.status !== "IN_PROGRESS")
      .map((m) => ({
        key: `mo-${m.id}`,
        label: m.reference,
        sublabel: m.status.replace(/_/g, " "),
        to: `/manufacturing/${m.id}`,
      }));
    return [...mos, ...pos];
  }, [pendingPurchases.data, pendingMfg.data]);

  // In Production — MOs currently in progress.
  const inProduction = useMemo<ActionItem[]>(
    () =>
      (pendingMfg.data ?? [])
        .filter((m) => m.status === "IN_PROGRESS")
        .map((m) => ({ key: `mo-${m.id}`, label: m.reference, sublabel: "In progress", to: `/manufacturing/${m.id}` })),
    [pendingMfg.data],
  );

  // Ready to Deliver — confirmed SOs whose outstanding quantity is fully reserved.
  const readyToDeliver = useMemo<ActionItem[]>(() => {
    return (sales.data ?? [])
      .filter((so) => {
        if (so.status !== "CONFIRMED" && so.status !== "PARTIALLY_DELIVERED") return false;
        const outstanding = so.lines.some((l) => l.remaining_to_deliver > 1e-9);
        const allReserved = so.lines.every((l) => l.reserved_quantity + 1e-9 >= l.remaining_to_deliver);
        return outstanding && allReserved;
      })
      .map((so) => ({
        key: `so-${so.id}`,
        label: `SO-${so.id}`,
        sublabel: so.customer_name,
        to: `/sales/${so.id}`,
      }));
  }, [sales.data]);

  const lowStockItems = useMemo<ActionItem[]>(
    () =>
      (lowStock.data ?? []).map((p) => ({
        key: `p-${p.product_id}`,
        label: p.name,
        sublabel: `${formatNumber(p.free_to_use_qty)} free / ${formatNumber(p.on_hand_qty)} on hand`,
        to: "/products",
      })),
    [lowStock.data],
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <ActionList
        title="Needs Procurement"
        icon={ShoppingCart}
        tone="warning"
        items={needsProcurement}
        isLoading={pendingPurchases.isLoading || pendingMfg.isLoading}
        emptyMessage="No open purchase or manufacturing orders."
      />
      <ActionList
        title="In Production"
        icon={Cog}
        tone="primary"
        items={inProduction}
        isLoading={pendingMfg.isLoading}
        emptyMessage="Nothing in production right now."
      />
      <ActionList
        title="Ready to Deliver"
        icon={Truck}
        tone="success"
        items={readyToDeliver}
        isLoading={sales.isLoading}
        emptyMessage="No orders are fully reserved yet."
      />
      <ActionList
        title="Low Stock Alerts"
        icon={AlertTriangle}
        tone="danger"
        items={lowStockItems}
        isLoading={lowStock.isLoading}
        emptyMessage="All products are above threshold."
      />
    </div>
  );
}

const MAX_VISIBLE = 4;

function ActionList({
  title,
  icon: Icon,
  tone,
  items,
  isLoading,
  emptyMessage,
}: {
  title: string;
  icon: LucideIcon;
  tone: BadgeProps["tone"];
  items: ActionItem[];
  isLoading?: boolean;
  emptyMessage: string;
}) {
  const visible = items.slice(0, MAX_VISIBLE);
  const extra = items.length - visible.length;

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-outline" />
          {title}
        </span>
      }
      actions={<Badge tone={tone}>{isLoading ? "…" : items.length}</Badge>}
      bodyClassName="p-2"
    >
      {isLoading ? (
        <p className="p-3 text-body-sm text-on-surface-variant">Loading…</p>
      ) : items.length === 0 ? (
        <p className="p-3 text-body-sm text-on-surface-variant">{emptyMessage}</p>
      ) : (
        <ul className="space-y-1">
          {visible.map((it) => (
            <li key={it.key}>
              <Link
                to={it.to}
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-surface-container-low"
              >
                <span className="min-w-0">
                  <span className="block truncate text-body-md font-semibold text-on-surface">{it.label}</span>
                  {it.sublabel && (
                    <span className="block truncate text-[11px] capitalize text-on-surface-variant">
                      {it.sublabel}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
          {extra > 0 && (
            <li className="px-3 py-1 text-[11px] text-on-surface-variant">+{extra} more</li>
          )}
        </ul>
      )}
    </SectionCard>
  );
}
