import { Activity } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SectionCard } from "@/components/common/SectionCard";
import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { useManufacturingStats } from "@/features/dashboard/hooks";

const STATUS_COLORS: Record<string, string> = {
  Draft: "#c7c4d8",
  Confirmed: "#4f46e5",
  "In Progress": "#3525cd",
  Done: "#006e4b",
  Cancelled: "#ba1a1a",
};

/**
 * Live manufacturing throughput by status (real data from
 * /dashboard/manufacturing-stats). Replaces the static mock line chart with a
 * meaningful, backend-driven distribution.
 */
export function ManufacturingChart() {
  const { data, isLoading, error, refetch } = useManufacturingStats();

  const chartData = data
    ? [
        { name: "Draft", value: data.draft },
        { name: "Confirmed", value: data.confirmed },
        { name: "In Progress", value: data.in_progress },
        { name: "Done", value: data.done },
        { name: "Cancelled", value: data.cancelled },
      ]
    : [];

  return (
    <SectionCard
      title="Manufacturing Orders by Status"
      icon={Activity}
      className="lg:col-span-8"
      actions={
        data ? (
          <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-label-upper uppercase text-primary">
            {Math.round(data.completion_rate * 100)}% completion
          </span>
        ) : null
      }
    >
      <div className="min-h-[300px] p-4">
        {isLoading ? (
          <LoadingState className="h-[280px]" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} className="h-[280px]" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5eeff" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#464555" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#464555" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "#eff4ff" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #c7c4d8",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#4f46e5"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </SectionCard>
  );
}
