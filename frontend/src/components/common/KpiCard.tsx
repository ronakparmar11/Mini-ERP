import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type Accent = "primary" | "error" | "tertiary" | "secondary" | "neutral";

const accentBlob: Record<Accent, string> = {
  primary: "bg-primary-container/10",
  error: "bg-error-container/30",
  tertiary: "bg-tertiary-container/10",
  secondary: "bg-secondary-container/60",
  neutral: "bg-surface-container-low",
};

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  accent?: Accent;
  footer?: ReactNode;
  isLoading?: boolean;
}

/** Reusable dashboard KPI tile (matches Stitch KPI grid). */
export function KpiCard({ label, value, icon: Icon, accent = "neutral", footer, isLoading }: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-outline-variant bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <div
        className={cn(
          "absolute -right-4 -top-4 h-16 w-16 rounded-full transition-transform duration-500 group-hover:scale-150",
          accentBlob[accent],
        )}
      />
      <div className="relative z-10 mb-2 flex items-start justify-between">
        <h3 className="text-body-sm text-on-surface-variant">{label}</h3>
        <Icon className="h-5 w-5 text-outline" />
      </div>
      {isLoading ? (
        <div className="relative z-10 h-8 w-20 animate-pulse rounded bg-surface-container" />
      ) : (
        <div className="relative z-10 text-headline-md font-bold text-on-background">{value}</div>
      )}
      {footer && <div className="relative z-10 mt-2">{footer}</div>}
    </div>
  );
}
