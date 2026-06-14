import { Download, Eye } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { useInvoices } from "@/features/invoices/hooks";
import { usePagination } from "@/hooks/usePagination";
import { INVOICE_STATUS_META, downloadInvoiceFile } from "@/features/invoices/invoiceUtils";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDateTime } from "@/utils/format";

export function InvoiceListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const { data, isLoading, error, refetch } = useInvoices(filter === "ALL" ? undefined : filter);
  const pg = usePagination(data ?? [], { resetKey: filter });

  const FILTERS: { label: string; value: InvoiceStatus | "ALL" }[] = [
    { label: t("invoices.filterAll"), value: "ALL" },
    { label: t("invoices.filterDraft"), value: "DRAFT" },
    { label: t("invoices.filterSent"), value: "SENT" },
  ];

  const columns: Column<Invoice>[] = [
    {
      id: "number",
      header: t("invoices.invoiceNumber"),
      width: "150px",
      cell: (inv) => <span className="font-semibold text-primary">{inv.invoice_number}</span>,
    },
    {
      id: "customer",
      header: t("common.customer"),
      cell: (inv) => (
        <div>
          <div className="font-medium text-on-surface">{inv.customer_name}</div>
          <div className="text-[11px] text-on-surface-variant">from SO-{inv.sales_order_id}</div>
        </div>
      ),
    },
    { id: "status", header: t("common.status"), cell: (inv) => <StatusBadge meta={INVOICE_STATUS_META[inv.status]} /> },
    {
      id: "total",
      header: t("common.total"),
      align: "right",
      cell: (inv) => <span className="font-semibold">{formatCurrency(inv.total_amount)}</span>,
    },
    {
      id: "generated",
      header: t("invoices.generated"),
      cell: (inv) => <span className="text-on-surface-variant">{formatDateTime(inv.generated_at)}</span>,
    },
    {
      id: "actions",
      header: t("common.status"),
      align: "right",
      cell: (inv) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/invoices/${inv.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
            {t("common.view")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              downloadInvoiceFile(inv.id, inv.invoice_number);
            }}
          >
            <Download className="h-4 w-4" />
            {t("common.download")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title={t("invoices.title")}
        subtitle={t("invoices.subtitle")}
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
          rowKey={(inv) => inv.id}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
          emptyMessage={t("invoices.noInvoicesFound")}
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
          noun={t("invoices.noun")}
        />
      </div>
    </div>
  );
}
