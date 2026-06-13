import { Trophy } from "lucide-react";

import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState, LoadingState } from "@/components/common/StateViews";
import { useExecutiveSummary } from "@/features/dashboard/hooks";
import { formatCurrency, formatNumber } from "@/utils/format";

/**
 * SECTION 3 (right) — Top Selling Products as a ranked progress list (no table).
 * Bar width is relative to the best-selling product.
 */
export function TopProductsCard() {
  const { data, isLoading } = useExecutiveSummary();
  const products = (data?.top_products ?? []).slice(0, 5);
  const maxUnits = products.reduce((m, p) => Math.max(m, p.units_sold), 0) || 1;

  return (
    <SectionCard title="Top Selling Products" icon={Trophy}>
      <div className="px-4 pb-2 pt-1">
        <p className="text-body-sm text-on-surface-variant">Products contributing most to revenue.</p>
      </div>
      <div className="p-4 pt-2">
        {isLoading ? (
          <LoadingState className="h-[240px]" />
        ) : products.length === 0 ? (
          <EmptyState message="No sales recorded yet." className="h-[240px]" />
        ) : (
          <ul className="space-y-4">
            {products.map((p, i) => (
              <li key={p.product_id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-container text-body-sm font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-body-md font-semibold text-on-surface">{p.name}</span>
                    <span className="shrink-0 text-[11px] text-on-surface-variant">
                      {formatNumber(p.units_sold)} sold · {formatCurrency(p.revenue)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(6, (p.units_sold / maxUnits) * 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
