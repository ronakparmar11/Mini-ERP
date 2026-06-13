import { ArrowDownRight, ArrowUpRight, Boxes, Factory, Gauge, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { KpiCard } from "@/components/common/KpiCard";
import { useExecutiveSummary } from "@/features/dashboard/hooks";
import { formatCurrency, formatNumber } from "@/utils/format";

/** Threshold → descriptive word for the fulfillment-rate KPI. */
function fulfillmentLabel(rate: number): string {
  if (rate >= 90) return "Excellent performance";
  if (rate >= 75) return "Moderate performance";
  return "Needs attention";
}
function inventoryLabel(health: number, attention: number): string {
  const status = health >= 85 ? "Healthy" : health >= 70 ? "Monitor" : "At risk";
  return `${status} · ${attention} product${attention === 1 ? "" : "s"} need attention`;
}

const Sub = ({ children }: { children: ReactNode }) => (
  <p className="text-[11px] text-on-surface-variant">{children}</p>
);

/**
 * SECTION 1 — Executive Overview hero. Six uniform-height KPI tiles answering
 * "how healthy is my business today?" at a glance. All data from one endpoint.
 */
export function ExecutiveOverview() {
  const { data, isLoading } = useExecutiveSummary();
  const change = data?.revenue_change_pct ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        label="Revenue This Month"
        icon={Wallet}
        accent="primary"
        isLoading={isLoading}
        value={formatCurrency(data?.revenue_this_month ?? 0)}
        footer={
          change == null ? (
            <Sub>New revenue this period</Sub>
          ) : (
            <p className={`flex items-center gap-1 text-[11px] font-semibold ${change >= 0 ? "text-tertiary-container" : "text-error"}`}>
              {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {change >= 0 ? "+" : ""}{Math.round(change)}% compared to last month
            </p>
          )
        }
      />
      <KpiCard
        label="Sales Orders"
        icon={ReceiptText}
        accent="secondary"
        isLoading={isLoading}
        value={formatNumber(data?.sales_orders_total ?? 0)}
        footer={<Sub>{formatNumber(data?.sales_orders_awaiting ?? 0)} awaiting fulfillment</Sub>}
      />
      <KpiCard
        label="Fulfillment Rate"
        icon={Gauge}
        accent="tertiary"
        isLoading={isLoading}
        value={`${Math.round(data?.fulfillment_rate ?? 0)}%`}
        footer={<Sub>{fulfillmentLabel(data?.fulfillment_rate ?? 0)}</Sub>}
      />
      <KpiCard
        label="Inventory Health"
        icon={Boxes}
        accent="warning"
        isLoading={isLoading}
        value={`${Math.round(data?.inventory_health ?? 0)}%`}
        footer={<Sub>{inventoryLabel(data?.inventory_health ?? 0, data?.products_attention ?? 0)}</Sub>}
      />
      <KpiCard
        label="Active Manufacturing"
        icon={Factory}
        accent="indigo"
        isLoading={isLoading}
        value={formatNumber(data?.active_manufacturing ?? 0)}
        footer={<Sub>{formatNumber(data?.manufacturing_delayed ?? 0)} delayed order{(data?.manufacturing_delayed ?? 0) === 1 ? "" : "s"}</Sub>}
      />
      <KpiCard
        label="Outstanding Invoices"
        icon={TrendingUp}
        accent="rose"
        isLoading={isLoading}
        value={formatNumber(data?.outstanding_invoices ?? 0)}
        footer={<Sub>{formatCurrency(data?.outstanding_invoices_value ?? 0)} awaiting dispatch</Sub>}
      />
    </div>
  );
}
