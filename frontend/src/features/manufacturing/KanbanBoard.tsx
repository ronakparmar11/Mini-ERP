import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { useProducts } from "@/features/products/hooks";
import { ManufacturingCard } from "@/features/manufacturing/ManufacturingCard";
import { useManufacturingOrders } from "@/features/manufacturing/hooks";
import { KANBAN_COLUMNS } from "@/features/manufacturing/manufacturingUtils";
import type { ManufacturingOrder, ManufacturingOrderStatus } from "@/types/manufacturing";
import { cn } from "@/utils/cn";

export function KanbanBoard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useManufacturingOrders();
  const { data: products } = useProducts();

  const productName = useMemo(() => {
    const map = new Map((products ?? []).map((p) => [p.id, p.name]));
    return (id: number) => map.get(id) ?? `Product #${id}`;
  }, [products]);

  const grouped = useMemo(() => {
    const map: Record<ManufacturingOrderStatus, ManufacturingOrder[]> = {
      DRAFT: [],
      CONFIRMED: [],
      IN_PROGRESS: [],
      DONE: [],
      CANCELLED: [],
    };
    (data ?? []).forEach((mo) => map[mo.status].push(mo));
    return map;
  }, [data]);

  if (isLoading) return <LoadingState className="py-24" label={t("common.loading")} />;
  if (error)
    return (
      <div className="py-12">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((col) => {
        const items = grouped[col.status];
        const isActive = col.status === "IN_PROGRESS";
        return (
          <div
            key={col.status}
            className={cn(
              "flex h-[calc(100vh-220px)] w-[320px] shrink-0 flex-col rounded-xl border border-outline-variant bg-surface-container-low",
              isActive && "shadow-sm ring-1 ring-primary/20",
            )}
          >
            <div
              className={cn(
                "flex shrink-0 items-center justify-between rounded-t-xl border-b border-outline-variant p-4",
                isActive && "border-primary/20 bg-primary/5",
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", col.dotClass, isActive && "animate-pulse")} />
                <h3 className={cn("text-title-sm text-on-background", isActive && "font-bold text-primary")}>
                  {col.label}
                </h3>
                <span
                  className={cn(
                    "ml-1 rounded-full px-2 py-0.5 text-label-upper uppercase",
                    isActive ? "bg-primary/10 text-primary" : "bg-surface-variant text-on-surface-variant",
                  )}
                >
                  {items.length}
                </span>
              </div>
            </div>

            <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-3">
              {items.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-outline-variant text-body-sm text-on-surface-variant">
                  {t("manufacturing.noOrders")}
                </div>
              ) : (
                items.map((mo) => (
                  <ManufacturingCard
                    key={mo.id}
                    mo={mo}
                    productName={productName}
                    onClick={() => navigate(`/manufacturing/${mo.id}`)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
