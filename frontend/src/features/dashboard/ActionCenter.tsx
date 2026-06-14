import { AlertTriangle, CheckCircle2, Cog, FileText, ShoppingCart, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge } from "@/components/common/Badge";
import type { BadgeProps } from "@/components/common/Badge";
import { SectionCard } from "@/components/common/SectionCard";
import {
  useLowStock,
  usePendingManufacturing,
  usePendingPurchases,
} from "@/features/dashboard/hooks";
import { useInvoices } from "@/features/invoices/hooks";
import { useSalesOrders } from "@/features/sales/hooks";
import { formatCurrency, formatNumber } from "@/utils/format";

interface ActionItem {
  key: string;
  label: string;
  sublabel?: string;
  to: string;
}

export function ActionCenter() {
  const { t } = useTranslation();
  const pendingPurchases = usePendingPurchases();
  const pendingMfg = usePendingManufacturing();
  const lowStock = useLowStock();
  const sales = useSalesOrders();
  const invoices = useInvoices();

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

  const inProduction = useMemo<ActionItem[]>(
    () =>
      (pendingMfg.data ?? [])
        .filter((m) => m.status === "IN_PROGRESS")
        .map((m) => ({ key: `mo-${m.id}`, label: m.reference, sublabel: t("dashboard.inProgress"), to: `/manufacturing/${m.id}` })),
    [pendingMfg.data, t],
  );

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

  const awaitingDispatch = useMemo<ActionItem[]>(
    () =>
      (invoices.data ?? [])
        .filter((inv) => inv.status === "DRAFT")
        .map((inv) => ({
          key: `inv-${inv.id}`,
          label: inv.invoice_number,
          sublabel: `${inv.customer_name} · ${formatCurrency(inv.total_amount)}`,
          to: `/invoices/${inv.id}`,
        })),
    [invoices.data],
  );

  const lowStockItems = useMemo<ActionItem[]>(
    () =>
      (lowStock.data ?? []).map((p) => ({
        key: `p-${p.product_id}`,
        label: p.name,
        sublabel: `${formatNumber(p.free_to_use_qty)} ${t("dashboard.free")} / ${formatNumber(p.on_hand_qty)} ${t("products.onHand").toLowerCase()}`,
        to: "/products",
      })),
    [lowStock.data, t],
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <ActionList
        title={t("dashboard.needsProcurement")}
        icon={ShoppingCart}
        tone="warning"
        items={needsProcurement}
        isLoading={pendingPurchases.isLoading || pendingMfg.isLoading}
        emptyMessage={t("dashboard.noProcurementOrders")}
      />
      <ActionList
        title={t("dashboard.inProduction")}
        icon={Cog}
        tone="primary"
        items={inProduction}
        isLoading={pendingMfg.isLoading}
        emptyMessage={t("dashboard.nothingInProduction")}
      />
      <ActionList
        title={t("dashboard.readyToDeliver")}
        icon={Truck}
        tone="success"
        items={readyToDeliver}
        isLoading={sales.isLoading}
        emptyMessage={t("dashboard.noOrdersFullyReserved")}
      />
      <ActionList
        title={t("dashboard.invoicesAwaitingDispatch")}
        icon={FileText}
        tone="info"
        items={awaitingDispatch}
        isLoading={invoices.isLoading}
        emptyMessage={t("dashboard.noDraftInvoices")}
      />
      <ActionList
        title={t("dashboard.lowStockAlerts")}
        icon={AlertTriangle}
        tone="danger"
        items={lowStockItems}
        isLoading={lowStock.isLoading}
        emptyMessage={t("dashboard.allProductsAboveThreshold")}
      />
    </div>
  );
}

const MAX_VISIBLE = 3;
const BODY_HEIGHT = "h-[184px]";

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
  const { t } = useTranslation();
  const visible = items.slice(0, MAX_VISIBLE);
  const extra = items.length - visible.length;

  return (
    <SectionCard
      className="h-full"
      title={
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-outline" />
          {title}
        </span>
      }
      actions={<Badge tone={tone}>{isLoading ? "…" : items.length}</Badge>}
      bodyClassName={`flex flex-col ${BODY_HEIGHT} p-2`}
    >
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-body-sm text-on-surface-variant">{t("common.loading")}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-tertiary-container" />
          <p className="text-body-md font-semibold text-on-surface">{t("common.allCaughtUp")}</p>
          <p className="text-[11px] text-on-surface-variant">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-1">
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
            <li>
              <span className="block px-3 py-1 text-[11px] font-medium text-on-surface-variant">
                +{extra} {t("common.loading").replace("…", "")}
              </span>
            </li>
          )}
        </ul>
      )}
    </SectionCard>
  );
}
