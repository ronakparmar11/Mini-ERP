import type { LucideIcon } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/common/Badge";

export interface StatusMeta {
  label: string;
  tone: BadgeProps["tone"];
  icon?: LucideIcon;
}

/**
 * Renders a status pill from a `StatusMeta`. Each domain (sales/purchase/mfg)
 * supplies its own status→meta map, keeping this component fully reusable.
 */
export function StatusBadge({ meta, className }: { meta: StatusMeta; className?: string }) {
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone} className={className}>
      {Icon && <Icon className="h-3 w-3" />}
      {meta.label}
    </Badge>
  );
}
