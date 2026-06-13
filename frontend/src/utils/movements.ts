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
  /** Past-tense verb for a business sentence (e.g. "Reserved", "Used"). */
  verb: string;
  /** Preposition linking the movement to its source document. */
  preposition: string;
}

export const MOVEMENT_META: Record<MovementType, MovementMeta> = {
  SALE_RESERVATION: { label: "Reserved", icon: Bookmark, tone: "info", direction: "neutral", verb: "Reserved", preposition: "for" },
  SALE_DELIVERY: { label: "Delivered", icon: ArrowUpFromLine, tone: "primary", direction: "out", verb: "Delivered", preposition: "for" },
  PURCHASE_RECEIPT: { label: "Received", icon: ArrowDownToLine, tone: "success", direction: "in", verb: "Received", preposition: "from" },
  MO_CONSUMPTION: { label: "Consumed", icon: Flame, tone: "warning", direction: "out", verb: "Used", preposition: "in" },
  MO_PRODUCTION: { label: "Produced", icon: Factory, tone: "success", direction: "in", verb: "Produced", preposition: "from" },
};

const REFERENCE_PREFIX: Record<ReferenceType, string> = {
  SALES_ORDER: "SO",
  PURCHASE_ORDER: "PO",
  MANUFACTURING_ORDER: "MO",
};

const REFERENCE_ROUTE: Record<ReferenceType, string> = {
  SALES_ORDER: "/sales",
  PURCHASE_ORDER: "/purchase-orders",
  MANUFACTURING_ORDER: "/manufacturing",
};

/** Human reference tag e.g. "SO-12" / "PO-5" / "MO-3". */
export const referenceLabel = (type: ReferenceType, id: number): string =>
  `${REFERENCE_PREFIX[type]}-${id}`;

/** Router path to the source document, e.g. "/manufacturing/12". */
export const referencePath = (type: ReferenceType, id: number): string =>
  `${REFERENCE_ROUTE[type]}/${id}`;

/** Signed quantity prefix for display: +, − or empty (reservation). */
export const signedQuantity = (direction: Direction, qty: number): string => {
  if (direction === "in") return `+ ${qty}`;
  if (direction === "out") return `- ${qty}`;
  return `${qty}`;
};
