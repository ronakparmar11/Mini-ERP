import type { ReactNode } from "react";

import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { cn } from "@/utils/cn";

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  headerClassName?: string;
  cellClassName?: string;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  skeletonRows?: number;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

/** Generic, enterprise-style data table with built-in loading/error/empty states. */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  error,
  onRetry,
  onRowClick,
  emptyMessage,
  skeletonRows = 6,
}: DataTableProps<T>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 border-b border-outline-variant bg-surface-container-lowest">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  "px-3 py-2.5 text-label-upper uppercase text-on-surface-variant",
                  col.align && alignClass[col.align],
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-table-data text-on-surface">
          {error ? (
            <StateRow span={columns.length}>
              <ErrorState error={error} onRetry={onRetry} className="py-10" />
            </StateRow>
          ) : isLoading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="border-b border-outline-variant">
                {columns.map((col) => (
                  <td key={col.id} className="px-3 py-2.5">
                    <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-surface-container" />
                  </td>
                ))}
              </tr>
            ))
          ) : !data || data.length === 0 ? (
            <StateRow span={columns.length}>
              <EmptyState message={emptyMessage} className="py-10" />
            </StateRow>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "group border-b border-outline-variant transition-colors hover:bg-surface-container-low",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      "px-3 py-2.5 align-middle",
                      col.align && alignClass[col.align],
                      col.cellClassName,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StateRow({ span, children }: { span: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={span}>{children}</td>
    </tr>
  );
}
