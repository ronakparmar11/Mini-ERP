import {
  CheckCircle2,
  FileEdit,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";

import type { StatusMeta } from "@/components/common/StatusBadge";
import type { SalesOrderStatus } from "@/types/sales";

export const SALES_STATUS_META: Record<SalesOrderStatus, StatusMeta> = {
  DRAFT: { label: "Draft", tone: "neutral", icon: FileEdit },
  CONFIRMED: { label: "Confirmed", tone: "info", icon: CheckCircle2 },
  PARTIALLY_DELIVERED: { label: "Partially Delivered", tone: "warning", icon: Truck },
  DELIVERED: { label: "Delivered", tone: "success", icon: PackageCheck },
  CANCELLED: { label: "Cancelled", tone: "danger", icon: XCircle },
};

/** Ordered lifecycle for the timeline (cancellation is rendered separately). */
export const SALES_LIFECYCLE: { status: SalesOrderStatus; label: string }[] = [
  { status: "DRAFT", label: "Draft" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PARTIALLY_DELIVERED", label: "Delivering" },
  { status: "DELIVERED", label: "Delivered" },
];

/** Index of the order's current step within SALES_LIFECYCLE (−1 if cancelled). */
export function lifecycleIndex(status: SalesOrderStatus): number {
  if (status === "CANCELLED") return -1;
  return SALES_LIFECYCLE.findIndex((s) => s.status === status);
}

export const formatSoRef = (id: number): string => `SO-${id}`;
