import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SectionCard } from "@/components/common/SectionCard";
import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { useDashboardProducts } from "@/features/dashboard/hooks";
import { formatCurrency } from "@/utils/format";

/**
 * Top products by on-hand stock value (on_hand_qty × cost_price), computed from
 * the real product catalogue. The backend has no per-category field, so we show
 * value by product — an honest, data-driven adaptation of the design's chart.
 */
export function InventoryValueChart() {
  const { data, isLoading, error, refetch } = useDashboardProducts();

  const chartData = (data ?? [])
    .map((p) => ({ name: p.name, value: Number(p.on_hand_qty) * Number(p.cost_price) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <SectionCard title="Top Products by Stock Value" icon={BarChart3}>
      <div className="min-h-[250px] p-4">
        {isLoading ? (
          <LoadingState className="h-[240px]" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} className="h-[240px]" />
        ) : chartData.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-body-sm text-on-surface-variant">
            No valued stock on hand yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5eeff" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#464555" }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11, fill: "#464555" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#eff4ff" }}
                formatter={(v: number) => [formatCurrency(v), "Stock value"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #c7c4d8", fontSize: 13 }}
              />
              <Bar dataKey="value" fill="#4f46e5" radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </SectionCard>
  );
}
