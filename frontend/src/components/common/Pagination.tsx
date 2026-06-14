import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPrevious: () => void;
  onNext: () => void;
  onGoTo: (page: number) => void;
  /** Noun shown in the summary, e.g. "products". Defaults to "records". */
  noun?: string;
  className?: string;
}

/** Build a compact page list with ellipsis gaps for large page counts. */
function buildPages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

/**
 * Reusable list pagination control. Always rendered (even for a single page) so
 * the table footer height never shifts as the page count changes.
 */
export function Pagination({
  page, totalPages, total, from, to, onPrevious, onNext, onGoTo, noun = "records", className,
}: PaginationProps) {
  const { t } = useTranslation();
  if (total === 0) return null;
  const pages = buildPages(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t border-outline-variant px-3 py-3 sm:flex-row",
        className,
      )}
    >
      <p className="text-body-sm text-on-surface-variant">
        {t("pagination.showing")} <span className="font-semibold text-on-surface">{from}–{to}</span> {t("pagination.of")}{" "}
        <span className="font-semibold text-on-surface">{total}</span> {noun}
      </p>

      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" onClick={onPrevious} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("pagination.previous")}</span>
        </Button>

        {/* Numeric buttons (sm+) */}
        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((p, i) =>
            p === "ellipsis" ? (
              <span key={`e-${i}`} className="px-1.5 text-body-sm text-on-surface-variant">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onGoTo(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "min-w-9 rounded-lg px-3 py-1.5 text-body-sm font-medium transition-colors",
                  p === page
                    ? "bg-primary-container text-white"
                    : "text-on-surface-variant hover:bg-surface-container",
                )}
              >
                {p}
              </button>
            ),
          )}
        </div>

        {/* Compact indicator (mobile) */}
        <span className="px-2 text-body-sm text-on-surface-variant sm:hidden">
          {t("pagination.page")} {page} {t("pagination.of")} {totalPages}
        </span>

        <Button variant="secondary" size="sm" onClick={onNext} disabled={page >= totalPages}>
          <span className="hidden sm:inline">{t("pagination.next")}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
