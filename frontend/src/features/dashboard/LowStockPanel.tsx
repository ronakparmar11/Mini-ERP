import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/StateViews";
import { useLowStock } from "@/features/dashboard/hooks";
import { formatNumber } from "@/utils/format";

export function LowStockPanel() {
  const { data, isLoading, error, refetch } = useLowStock();
  const navigate = useNavigate();
  const items = data ?? [];

  return (
    <section className="flex flex-col rounded-lg border border-outline-variant bg-surface shadow-sm lg:col-span-4">
      <header className="flex items-center justify-between rounded-t-lg border-b border-outline-variant bg-error-container/20 p-4">
        <h2 className="flex items-center gap-2 text-title-sm text-on-background">
          <AlertTriangle className="h-5 w-5 text-error" />
          Low Stock Alerts
        </h2>
        {!isLoading && !error && (
          <span className="rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-on-error">
            {items.length} Item{items.length === 1 ? "" : "s"}
          </span>
        )}
      </header>

      <div className="max-h-[300px] flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState message="All products are above the low-stock threshold." />
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 border-b border-outline-variant bg-surface-container-low">
              <tr>
                <th className="p-3 text-label-upper uppercase text-on-surface-variant">Product</th>
                <th className="p-3 text-right text-label-upper uppercase text-on-surface-variant">
                  Free / On Hand
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p.product_id}
                  onClick={() => navigate("/products")}
                  className="cursor-pointer border-b border-outline-variant transition-colors last:border-0 hover:bg-surface-container-lowest"
                >
                  <td className="p-3 text-table-data">
                    <div className="font-semibold text-on-background">{p.name}</div>
                    <div className="text-[11px] text-on-surface-variant">#{p.product_id}</div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="font-semibold text-error">
                      {formatNumber(p.free_to_use_qty)}{" "}
                      <span className="font-normal text-on-surface-variant">
                        / {formatNumber(p.on_hand_qty)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <footer className="rounded-b-lg border-t border-outline-variant bg-surface-container-low p-3 text-center">
        <button
          onClick={() => navigate("/products")}
          className="text-label-upper uppercase text-primary hover:underline"
        >
          View All Inventory
        </button>
      </footer>
    </section>
  );
}
