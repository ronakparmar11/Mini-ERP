import { AlertTriangle, FileWarning, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { SectionCard } from "@/components/common/SectionCard";
import { useExecutiveSummary, useLowStock } from "@/features/dashboard/hooks";
import { formatCurrency, formatNumber } from "@/utils/format";

type Tone = "amber" | "indigo" | "rose";

const toneRing: Record<Tone, { box: string; chip: string; icon: string }> = {
  amber: { box: "border-l-[#f59e0b]", chip: "bg-[#fffbeb] text-[#b45309]", icon: "text-[#b45309]" },
  indigo: { box: "border-l-primary", chip: "bg-secondary-container text-primary", icon: "text-primary" },
  rose: { box: "border-l-[#f43f5e]", chip: "bg-error-container/40 text-on-error-container", icon: "text-error" },
};

function RiskCard({
  title, icon, tone, count, children,
}: {
  title: string; icon: LucideIcon; tone: Tone; count: number; children: ReactNode;
}) {
  const t = toneRing[tone];
  return (
    <SectionCard
      className={`border-l-4 ${t.box}`}
      title={
        <span className="flex items-center gap-2">
          {(() => { const I = icon; return <I className={`h-4 w-4 ${t.icon}`} />; })()}
          {title}
        </span>
      }
      actions={<span className={`rounded-full px-2 py-0.5 text-label-upper uppercase ${t.chip}`}>{count}</span>}
      bodyClassName="p-4"
    >
      {children}
    </SectionCard>
  );
}

export function OperationalRisks() {
  const { data } = useExecutiveSummary();
  const { t } = useTranslation();
  const lowStock = useLowStock();
  const low = lowStock.data ?? [];

  const delayed = data?.manufacturing_delayed ?? 0;
  const outstanding = data?.outstanding_invoices ?? 0;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <RiskCard title={t("dashboard.lowStockRisks")} icon={AlertTriangle} tone="amber" count={low.length}>
        {low.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">{t("dashboard.allProductsAboveThreshold")}</p>
        ) : (
          <ul className="space-y-2">
            {low.slice(0, 3).map((p) => (
              <li key={p.product_id} className="flex items-center justify-between gap-2 text-body-sm">
                <span className="truncate text-on-surface">{p.name}</span>
                <span className="shrink-0 font-semibold text-[#b45309]">
                  {formatNumber(p.free_to_use_qty)} {t("dashboard.free")}
                </span>
              </li>
            ))}
            {low.length > 3 && (
              <li>
                <Link to="/products" className="text-[11px] font-medium text-primary hover:underline">
                  +{low.length - 3} {t("common.noResults").replace(".", "")}
                </Link>
              </li>
            )}
          </ul>
        )}
      </RiskCard>

      <RiskCard title={t("dashboard.manufacturingDelays")} icon={Timer} tone="indigo" count={delayed}>
        <p className="text-body-sm text-on-surface-variant">
          {delayed === 0
            ? t("dashboard.allOrdersOnSchedule")
            : `${formatNumber(delayed)} ${t("dashboard.ordersDelayed")}`}
        </p>
        <Link to="/manufacturing" className="mt-2 inline-block text-[11px] font-medium text-primary hover:underline">
          {t("dashboard.reviewManufacturing")}
        </Link>
      </RiskCard>

      <RiskCard title={t("dashboard.invoiceDispatchDelays")} icon={FileWarning} tone="rose" count={outstanding}>
        <p className="text-body-sm text-on-surface-variant">
          {outstanding === 0
            ? t("dashboard.noInvoicesAwaiting")
            : `${formatCurrency(data?.outstanding_invoices_value ?? 0)} ${t("dashboard.invoicesAcross").replace("{{count}}", String(outstanding))}`}
        </p>
        <Link to="/invoices" className="mt-2 inline-block text-[11px] font-medium text-primary hover:underline">
          {t("dashboard.reviewInvoices")}
        </Link>
      </RiskCard>
    </div>
  );
}
