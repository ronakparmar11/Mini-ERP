import { Badge } from "@/components/common/Badge";
import type { MovementType } from "@/types/inventory";
import { MOVEMENT_META } from "@/utils/movements";

/** Reusable pill for an inventory movement type (icon + tone from MOVEMENT_META). */
export function MovementBadge({ type }: { type: MovementType }) {
  const meta = MOVEMENT_META[type];
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}
