import { ArrowDownRight, ArrowUpRight, Boxes, Factory, Gauge, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { KpiCard } from "@/components/common/KpiCard";
import { useExecutiveSummary } from "@/features/dashboard/hooks";
import { formatCurrency, formatNumber } from "@/utils/format";

const Sub = ({ children }: { children: ReactNode }) => (
  <p className="text-[11px] text-on-surface-variant">{children}</p>
);

export function ExecutiveOverview() {
  const { data, isLoading } = useExecutiveSummary();
  const { t } = useTranslation();
  const change = data?.revenue_change_pct ?? null;

  const attention = data?.products_attention ?? 0;
  const health = data?.inventory_health ?? 0;
  const inventoryStatus =
    health >= 85
      ? t("dashboard.inventoryHealthy")
      : health >= 70
        ? t("dashboard.inventoryMonitor")
        : t("dashboard.inventoryAtRisk");
  const inventorySubLabel = `${inventoryStatus} · ${formatNumber(attention)} ${attention === 1 ? t("dashboard.productsNeedAttention") : t("dashboard.productsNeedAttentionPlural")}`;

  const fulfillmentRate = data?.fulfillment_rate ?? 0;
  const fulfillmentSubLabel =
    fulfillmentRate >= 90
      ? t("dashboard.excellentPerformance")
      : fulfillmentRate >= 75
        ? t("dashboard.moderatePerformance")
        : t("dashboard.needsAttention");

  const delayed = data?.manufacturing_delayed ?? 0;
  const delayedLabel = `${formatNumber(delayed)} ${delayed === 1 ? t("dashboard.delayedOrder") : t("dashboard.delayedOrders")}`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        label={t("dashboard.revenueThisMonth")}
        icon={Wallet}
        accent="primary"
        isLoading={isLoading}
        value={formatCurrency(data?.revenue_this_month ?? 0)}
        footer={
          change == null ? (
            <Sub>{t("dashboard.newRevenueThisPeriod")}</Sub>
          ) : (
            <p className={`flex items-center gap-1 text-[11px] font-semibold ${change >= 0 ? "text-tertiary-container" : "text-error"}`}>
              {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {change >= 0 ? "+" : ""}{Math.round(change)}{t("dashboard.comparedToLastMonth")}
            </p>
          )
        }
      />
      <KpiCard
        label={t("dashboard.salesOrders")}
        icon={ReceiptText}
        accent="secondary"
        isLoading={isLoading}
        value={formatNumber(data?.sales_orders_total ?? 0)}
        footer={<Sub>{formatNumber(data?.sales_orders_awaiting ?? 0)} {t("dashboard.awaitingFulfillment")}</Sub>}
      />
      <KpiCard
        label={t("dashboard.fulfillmentRate")}
        icon={Gauge}
        accent="tertiary"
        isLoading={isLoading}
        value={`${Math.round(fulfillmentRate)}%`}
        footer={<Sub>{fulfillmentSubLabel}</Sub>}
      />
      <KpiCard
        label={t("dashboard.inventoryHealth")}
        icon={Boxes}
        accent="warning"
        isLoading={isLoading}
        value={`${Math.round(health)}%`}
        footer={<Sub>{inventorySubLabel}</Sub>}
      />
      <KpiCard
        label={t("dashboard.activeManufacturing")}
        icon={Factory}
        accent="indigo"
        isLoading={isLoading}
        value={formatNumber(data?.active_manufacturing ?? 0)}
        footer={<Sub>{delayedLabel}</Sub>}
      />
      <KpiCard
        label={t("dashboard.outstandingInvoices")}
        icon={TrendingUp}
        accent="rose"
        isLoading={isLoading}
        value={formatNumber(data?.outstanding_invoices ?? 0)}
        footer={<Sub>{formatCurrency(data?.outstanding_invoices_value ?? 0)} {t("dashboard.awaitingDispatch")}</Sub>}
      />
    </div>
  );
}
