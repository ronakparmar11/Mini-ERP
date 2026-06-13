import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bookmark,
  Factory,
  Flame,
  type LucideIcon,
} from "lucide-react";

import type { BadgeProps } from "@/components/common/Badge";
import type { MovementType, ReferenceType } from "@/types/inventory";

type Tone = NonNullable<BadgeProps["tone"]>;
type Direction = "in" | "out" | "neutral";

interface MovementMeta {
  label: string;
  icon: LucideIcon;
  tone: Tone;
  direction: Direction;
}

export const MOVEMENT_META: Record<MovementType, MovementMeta> = {
  SALE_RESERVATION: { label: "Reserved", icon: Bookmark, tone: "info", direction: "neutral" },
  SALE_DELIVERY: { label: "Delivered", icon: ArrowUpFromLine, tone: "primary", direction: "out" },
  PURCHASE_RECEIPT: { label: "Received", icon: ArrowDownToLine, tone: "success", direction: "in" },
  MO_CONSUMPTION: { label: "Consumed", icon: Flame, tone: "warning", direction: "out" },
  MO_PRODUCTION: { label: "Produced", icon: Factory, tone: "success", direction: "in" },
};

const REFERENCE_PREFIX: Record<ReferenceType, string> = {
  SALES_ORDER: "SO",
  PURCHASE_ORDER: "PO",
  MANUFACTURING_ORDER: "MO",
};

/** Human reference tag e.g. "SO-12" / "PO-5" / "MO-3". */
export const referenceLabel = (type: ReferenceType, id: number): string =>
  `${REFERENCE_PREFIX[type]}-${id}`;

/** Signed quantity prefix for display: +, − or empty (reservation). */
export const signedQuantity = (direction: Direction, qty: number): string => {
  if (direction === "in") return `+ ${qty}`;
  if (direction === "out") return `- ${qty}`;
  return `${qty}`;
};
