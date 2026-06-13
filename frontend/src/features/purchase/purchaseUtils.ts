import { CheckCircle2, FileEdit, PackageCheck, Truck, XCircle } from "lucide-react";

import type { StatusMeta } from "@/components/common/StatusBadge";
import type { PurchaseOrderStatus } from "@/types/purchase";

export const PURCHASE_STATUS_META: Record<PurchaseOrderStatus, StatusMeta> = {
  DRAFT: { label: "Draft", tone: "neutral", icon: FileEdit },
  CONFIRMED: { label: "Confirmed", tone: "info", icon: CheckCircle2 },
  PARTIALLY_RECEIVED: { label: "Partially Received", tone: "warning", icon: Truck },
  RECEIVED: { label: "Received", tone: "success", icon: PackageCheck },
  CANCELLED: { label: "Cancelled", tone: "danger", icon: XCircle },
};

export const formatPoRef = (id: number): string => `PO-${id}`;
