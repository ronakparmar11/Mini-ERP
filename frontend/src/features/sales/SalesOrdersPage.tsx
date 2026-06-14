import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { CreateSalesOrderDrawer } from "@/features/sales/CreateSalesOrderDrawer";
import { useSalesOrders } from "@/features/sales/hooks";
import { usePagination } from "@/hooks/usePagination";
import { SALES_STATUS_META, formatSoRef } from "@/features/sales/salesUtils";
import type { SalesOrder, SalesOrderStatus } from "@/types/sales";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDateTime } from "@/utils/format";

const FILTERS: { label: string; value: SalesOrderStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Partially Delivered", value: "PARTIALLY_DELIVERED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function SalesOrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState<SalesOrderStatus | "ALL">("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, error, refetch } = useSalesOrders(filter === "ALL" ? undefined : filter);
  const pg = usePagination(data ?? [], { resetKey: filter });

  // Voice / deep-link: open the create drawer when navigated with state.create.
  useEffect(() => {
    if ((location.state as { create?: boolean } | null)?.create) {
      setDrawerOpen(true);
      navigate(location.pathname, { replace: true, state: null }); // clear so back/refresh won't reopen
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const columns: Column<SalesOrder>[] = [
    {
      id: "ref",
      header: "Order",
      width: "100px",
      cell: (so) => <span className="font-semibold text-primary">{formatSoRef(so.id)}</span>,
    },
    {
      id: "customer",
      header: "Customer",
      cell: (so) => (
        <div>
          <div className="font-medium text-on-surface">{so.customer_name}</div>
          {so.salesperson && (
            <div className="text-[11px] text-on-surface-variant">by {so.salesperson}</div>
          )}
        </div>
      ),
    },
    {
      id: "date",
      header: "Order Date",
      cell: (so) => <span className="text-on-surface-variant">{formatDateTime(so.creation_date)}</span>,
    },
    { id: "lines", header: "Lines", align: "right", cell: (so) => so.lines.length },
    {
      id: "status",
      header: "Status",
      cell: (so) => <StatusBadge meta={SALES_STATUS_META[so.status]} />,
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      cell: (so) => <span className="font-semibold">{formatCurrency(so.total_amount)}</span>,
    },
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Sales Orders"
        subtitle="Quote-to-cash: reserve stock and trigger demand-driven procurement."
        actions={
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="h-4 w-4" />
            New Sales Order
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
                filter === f.value
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={pg.pageItems}
          rowKey={(so) => so.id}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(so) => navigate(`/sales/${so.id}`)}
          emptyMessage="No sales orders found for this filter."
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

      <CreateSalesOrderDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
