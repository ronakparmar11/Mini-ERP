import type { BadgeProps } from "@/components/common/Badge";
import type { ProcurementMethod, Product } from "@/types/product";

/** Mirrors the backend default LOW_STOCK_THRESHOLD (docs/progress.md). */
export const LOW_STOCK_THRESHOLD = 5;

type Tone = NonNullable<BadgeProps["tone"]>;

export interface StockStatus {
  label: "Out" | "Low" | "In Stock";
  dotClass: string;
  tone: Tone;
}

export function getStockStatus(product: Product): StockStatus {
  const free = Number(product.free_to_use_qty);
  if (free <= 0) return { label: "Out", dotClass: "bg-error", tone: "danger" };
  if (free <= LOW_STOCK_THRESHOLD) return { label: "Low", dotClass: "bg-[#f59e0b]", tone: "warning" };
  return { label: "In Stock", dotClass: "bg-tertiary-container", tone: "success" };
}

export const PROCUREMENT_META: Record<ProcurementMethod, { label: string; tone: Tone }> = {
  MANUFACTURE: { label: "Manufacture", tone: "primary" },
  PURCHASE: { label: "Purchase", tone: "success" },
};
