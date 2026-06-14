import { Network, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { BomDetailDrawer } from "@/features/bom/BomDetailDrawer";
import { CreateBomDrawer } from "@/features/bom/CreateBomDrawer";
import { useBoms } from "@/features/bom/hooks";
import { useProducts } from "@/features/products/hooks";
import { usePagination } from "@/hooks/usePagination";
import type { BoM } from "@/types/bom";
import { formatNumber } from "@/utils/format";

export function BomPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useBoms();
  const { data: products } = useProducts();

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<BoM | null>(null);

  const pg = usePagination(data ?? []);

  const productName = useMemo(() => {
    const map = new Map((products ?? []).map((p) => [p.id, p.name]));
    return (id: number) => map.get(id) ?? `Product #${id}`;
  }, [products]);

  const columns: Column<BoM>[] = [
    { id: "id", header: t("bom.id"), width: "70px", cell: (b) => <span className="font-medium text-on-surface-variant">#{b.id}</span> },
    {
      id: "finished",
      header: t("bom.finishedProduct"),
      cell: (b) => <span className="font-medium text-on-surface">{productName(b.finished_product_id)}</span>,
    },
    { id: "quantity", header: t("bom.quantity"), align: "right", cell: (b) => formatNumber(b.quantity) },
    { id: "components", header: t("bom.components"), align: "right", cell: (b) => b.components.length },
    { id: "operations", header: t("bom.operations"), align: "right", cell: (b) => b.operations.length },
    {
      id: "actions",
      header: "",
      width: "80px",
      align: "right",
      cell: (b) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelected(b);
          }}
          className="text-body-sm font-semibold text-primary opacity-0 transition-opacity hover:underline group-hover:opacity-100"
        >
          {t("common.view")}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title={t("bom.title")}
        subtitle={t("bom.subtitle")}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("bom.createBom")}
          </Button>
        }
      />

      <div className="rounded-xl border border-outline-variant bg-surface shadow-sm">
        <DataTable
          columns={columns}
          data={pg.pageItems}
          rowKey={(b) => b.id}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(b) => setSelected(b)}
          emptyMessage={t("bom.noBomsFound")}
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
          noun={t("bom.noun")}
        />
      </div>

      <CreateBomDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
      <BomDetailDrawer
        open={selected !== null}
        bom={selected}
        productName={productName}
        onClose={() => setSelected(null)}
      />

      <p className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
        <Network className="h-3.5 w-3.5" />
        {t("bom.bomNote")}
      </p>
    </div>
  );
}
