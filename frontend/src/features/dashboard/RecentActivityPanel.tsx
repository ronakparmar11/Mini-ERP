import { ListChecks } from "lucide-react";
import { useMemo } from "react";

import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateViews";
import { useDashboardProducts, useRecentMovements } from "@/features/dashboard/hooks";
import { cn } from "@/utils/cn";
import { formatNumber, formatRelative } from "@/utils/format";
import { MOVEMENT_META, referenceLabel, signedQuantity } from "@/utils/movements";

const TONE_BG: Record<string, string> = {
  info: "bg-secondary-container text-on-secondary-container",
  primary: "bg-primary-container/15 text-primary",
  success: "bg-tertiary-container/15 text-tertiary-container",
  warning: "bg-[#fffbeb] text-[#b45309]",
  neutral: "bg-surface-container-high text-on-surface-variant",
  danger: "bg-error-container/40 text-on-error-container",
};

/**
 * Recent Activity = the live inventory movement ledger (real traceability data),
 * mapping each movement to the source document and product it affected.
 */
export function RecentActivityPanel() {
  const { data: movements, isLoading, error, refetch } = useRecentMovements(8);
  const { data: products } = useDashboardProducts();

  const productNameById = useMemo(() => {
    const map = new Map<number, string>();
    (products ?? []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [products]);

  return (
    <SectionCard title="Recent Activity" icon={ListChecks}>
      <div className="max-h-[320px] overflow-y-auto p-4">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : !movements || movements.length === 0 ? (
          <EmptyState message="No inventory activity recorded yet." />
        ) : (
          <ol className="space-y-4">
            {movements.map((m, idx) => {
              const meta = MOVEMENT_META[m.movement_type];
              const Icon = meta.icon;
              const isLast = idx === movements.length - 1;
              return (
                <li key={m.id} className="relative flex gap-3">
                  {!isLast && (
                    <span className="absolute left-[15px] top-8 h-full w-[2px] bg-outline-variant" />
                  )}
                  <span
                    className={cn(
                      "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-surface",
                      TONE_BG[meta.tone] ?? TONE_BG.neutral,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-sm text-on-background">
                      <span className="font-semibold">
                        {referenceLabel(m.reference_type, m.reference_id)}
                      </span>{" "}
                      {meta.label.toLowerCase()}{" "}
                      <span className="font-semibold">
                        {signedQuantity(meta.direction, Number(m.quantity))}
                      </span>{" "}
                      {productNameById.get(m.product_id) ?? `product #${m.product_id}`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">
                      {formatRelative(m.timestamp)} • {formatNumber(m.quantity)} units
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </SectionCard>
  );
}
