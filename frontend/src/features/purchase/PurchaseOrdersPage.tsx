import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { CreatePurchaseOrderDrawer } from "@/features/purchase/CreatePurchaseOrderDrawer";
import { usePurchaseOrders } from "@/features/purchase/hooks";
import { usePagination } from "@/hooks/usePagination";
import { PURCHASE_STATUS_META, formatPoRef } from "@/features/purchase/purchaseUtils";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/types/purchase";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDateTime } from "@/utils/format";

const FILTERS: { label: string; value: PurchaseOrderStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Partially Received", value: "PARTIALLY_RECEIVED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PurchaseOrderStatus | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, error, refetch } = usePurchaseOrders(filter === "ALL" ? undefined : filter);
  const pg = usePagination(data ?? [], { resetKey: filter });

  const columns: Column<PurchaseOrder>[] = [
    { id: "ref", header: "PO", width: "100px", cell: (po) => <span className="font-semibold text-primary">{formatPoRef(po.id)}</span> },
    {
      id: "vendor",
      header: "Vendor",
      cell: (po) => (
        <div>
          <div className="font-medium text-on-surface">{po.vendor}</div>
          {po.source_sales_order_id != null && (
            <div className="text-[11px] text-on-surface-variant">from SO-{po.source_sales_order_id}</div>
          )}
        </div>
      ),
    },
    { id: "date", header: "Creation Date", cell: (po) => <span className="text-on-surface-variant">{formatDateTime(po.creation_date)}</span> },
    { id: "status", header: "Status", cell: (po) => <StatusBadge meta={PURCHASE_STATUS_META[po.status]} /> },
    { id: "total", header: "Total", align: "right", cell: (po) => <span className="font-semibold">{formatCurrency(po.total_amount)}</span> },
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Purchase Orders"
        subtitle="Procure stock from vendors and receive goods into inventory."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Purchase Order
          </Button>
        }
      />

      <div className="flex flex-col rounded-xl border border-outline-variant bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-outline-variant p-3">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-body-sm font-medium transition-colors",
                filter === f.value ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={pg.pageItems}
          rowKey={(po) => po.id}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(po) => navigate(`/purchase-orders/${po.id}`)}
          emptyMessage="No purchase orders found for this filter."
        />

        <Pagination
          page={pg.page}
          totalPages={pg.totalPages}
          total={pg.total}
          from={pg.from}
          to={pg.to}
          onPrevious={pg.previousPage}
          onNext={pg.nextPage}
          onGoTo={pg.goToPage}
          noun="orders"
        />
      </div>

      <CreatePurchaseOrderDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
