import { CalendarDays, ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ManufacturingOrder, ManufacturingOrderStatus } from "@/types/manufacturing";
import { cn } from "@/utils/cn";
import { formatDateTime, formatNumber } from "@/utils/format";
import { formatMoRef } from "@/features/manufacturing/manufacturingUtils";

const ACCENT: Record<ManufacturingOrderStatus, string> = {
  DRAFT: "border-l-outline-variant",
  CONFIRMED: "border-l-primary-fixed-dim",
  IN_PROGRESS: "border-l-primary",
  DONE: "border-l-tertiary-container",
  CANCELLED: "border-l-error",
};

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

interface ManufacturingCardProps {
  mo: ManufacturingOrder;
  productName: (id: number) => string;
  onClick: () => void;
}

export function ManufacturingCard({ mo, productName, onClick }: ManufacturingCardProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full rounded-lg border border-l-4 border-outline-variant bg-surface p-4 text-left shadow-sm transition-shadow hover:shadow-md",
        ACCENT[mo.status],
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-label-upper uppercase font-bold text-on-surface-variant">
          {formatMoRef(mo.id)}
        </span>
      </div>
      <h4 className="mb-1 text-body-md font-semibold text-on-surface">
        {productName(mo.finished_product_id)}
      </h4>
      <p className="mb-3 text-body-sm text-on-surface-variant">
        {t("manufacturing.qty")}: {formatNumber(mo.quantity_to_produce)} {t("manufacturing.units")}
      </p>

      {mo.source_sales_order_id != null && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 rounded border border-outline-variant bg-surface-container px-2 py-1 text-[11px] text-on-surface">
            <ReceiptText className="h-3.5 w-3.5" />
            SO-{mo.source_sales_order_id}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-surface-variant pt-3">
        {mo.assignee ? (
          <span
            title={mo.assignee}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-surface-variant text-[10px] font-bold text-on-surface-variant"
          >
            {initials(mo.assignee)}
          </span>
        ) : (
          <span className="text-[11px] text-on-surface-variant">{t("manufacturing.unassigned")}</span>
        )}
        {mo.schedule_date ? (
          <span className="flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] text-on-surface-variant">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDateTime(mo.schedule_date)}
          </span>
        ) : (
          <span className="text-[11px] text-on-surface-variant">{t("manufacturing.noDeadline")}</span>
        )}
      </div>
    </button>
  );
}
