import { CheckCircle2, Cog, FileEdit, PackageCheck, XCircle } from "lucide-react";

import type { StatusMeta } from "@/components/common/StatusBadge";
import type { MOComponent, ManufacturingOrderStatus } from "@/types/manufacturing";

export const MANUFACTURING_STATUS_META: Record<ManufacturingOrderStatus, StatusMeta> = {
  DRAFT: { label: "Draft", tone: "neutral", icon: FileEdit },
  CONFIRMED: { label: "Confirmed", tone: "info", icon: CheckCircle2 },
  IN_PROGRESS: { label: "In Progress", tone: "primary", icon: Cog },
  DONE: { label: "Done", tone: "success", icon: PackageCheck },
  CANCELLED: { label: "Cancelled", tone: "danger", icon: XCircle },
};

/** Kanban column order + accent dot colour (mirrors Stitch screen 5). */
export const KANBAN_COLUMNS: {
  status: ManufacturingOrderStatus;
  label: string;
  dotClass: string;
}[] = [
  { status: "DRAFT", label: "Draft", dotClass: "bg-outline-variant" },
  { status: "CONFIRMED", label: "Confirmed", dotClass: "bg-primary-fixed-dim" },
  { status: "IN_PROGRESS", label: "In Progress", dotClass: "bg-primary" },
  { status: "DONE", label: "Done", dotClass: "bg-tertiary-container" },
  { status: "CANCELLED", label: "Cancelled", dotClass: "bg-error" },
];

export const formatMoRef = (id: number): string => `MO-${id}`;

/** Component consumption state for the detail "BoM Consumed" table. */
export function componentConsumptionStatus(c: MOComponent): StatusMeta {
  const required = Number(c.quantity_required);
  const consumed = Number(c.quantity_consumed);
  if (consumed <= 0) return { label: "Waiting", tone: "neutral" };
  if (consumed + 1e-9 >= required) return { label: "Consumed", tone: "success" };
  return { label: "Partial", tone: "warning" };
}
