import { Pencil } from "lucide-react";

import { Badge } from "@/components/common/Badge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { PROCUREMENT_META, getStockStatus } from "@/features/products/productUtils";
import type { Product } from "@/types/product";
import { formatCurrency, formatNumber } from "@/utils/format";

interface ProductsTableProps {
  data: Product[] | undefined;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onEdit: (product: Product) => void;
}

export function ProductsTable({ data, isLoading, error, onRetry, onEdit }: ProductsTableProps) {
  const columns: Column<Product>[] = [
    {
      id: "ref",
      header: "Ref",
      width: "80px",
      cell: (p) => <span className="font-medium text-on-surface-variant">#{p.id}</span>,
    },
    {
      id: "name",
      header: "Product Name",
      cell: (p) => (
        <div>
          <div className="font-medium text-on-surface">{p.name}</div>
          <div className="text-[11px] text-on-surface-variant">
            Cost {formatCurrency(p.cost_price)}
          </div>
        </div>
      ),
    },
    {
      id: "on_hand",
      header: "On Hand",
      align: "right",
      cell: (p) => {
        const status = getStockStatus(p);
        return (
          <div className="flex items-center justify-end gap-2" title={status.label}>
            {formatNumber(p.on_hand_qty)}
            <span className={`inline-block h-2 w-2 rounded-full ${status.dotClass}`} />
          </div>
        );
      },
    },
    {
      id: "free",
      header: "Free to Use",
      align: "right",
      cell: (p) => <span className="text-on-surface-variant">{formatNumber(p.free_to_use_qty)}</span>,
    },
    {
      id: "procurement",
      header: "Procurement",
      cell: (p) => {
        const meta = PROCUREMENT_META[p.procurement_method];
        return (
          <div className="flex items-center gap-1.5">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {p.procure_on_demand && (
              <span className="text-[10px] font-semibold uppercase text-outline">On demand</span>
            )}
          </div>
        );
      },
    },
    {
      id: "price",
      header: "Unit Price",
      align: "right",
      cell: (p) => formatCurrency(p.sales_price),
    },
    {
      id: "actions",
      header: "",
      width: "48px",
      align: "right",
      cell: (p) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(p);
          }}
          className="text-on-surface-variant opacity-0 transition-all hover:text-primary group-hover:opacity-100"
          aria-label={`Edit ${p.name}`}
        >
          <Pencil className="h-[18px] w-[18px]" />
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={(p) => p.id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      onRowClick={onEdit}
      emptyMessage="No products match your search."
    />
  );
}
