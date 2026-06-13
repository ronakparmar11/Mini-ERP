import { LineChart as LineChartIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SectionCard } from "@/components/common/SectionCard";
import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { useExecutiveSummary } from "@/features/dashboard/hooks";
import { formatCurrency } from "@/utils/format";

/**
 * SECTION 3 (left) — compact revenue trend over the last 4 weeks. Smooth area
 * line using the existing chart library (recharts) and the brand palette.
 */
export function RevenueTrendCard() {
  const { data, isLoading, error, refetch } = useExecutiveSummary();
  const points = data?.revenue_trend ?? [];

  return (
    <SectionCard
      title="Revenue Trend"
      icon={LineChartIcon}
      headerClassName="items-start"
    >
      <div className="px-4 pb-2 pt-1">
        <p className="text-body-sm text-on-surface-variant">Revenue performance over time.</p>
      </div>
      <div className="px-2 pb-4">
        {isLoading ? (
          <LoadingState className="h-[280px]" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} className="h-[280px]" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={points} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5eeff" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#464555" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "#464555" }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #c7c4d8", fontSize: 13 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3525cd"
                strokeWidth={2.5}
                fill="url(#revFill)"
                dot={{ r: 3, fill: "#3525cd" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </SectionCard>
  );
}
