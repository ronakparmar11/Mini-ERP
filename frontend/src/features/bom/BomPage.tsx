import { Network, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { BomDetailDrawer } from "@/features/bom/BomDetailDrawer";
import { CreateBomDrawer } from "@/features/bom/CreateBomDrawer";
import { useBoms } from "@/features/bom/hooks";
import { useProducts } from "@/features/products/hooks";
import type { BoM } from "@/types/bom";
import { formatNumber } from "@/utils/format";

export function BomPage() {
  const { data, isLoading, error, refetch } = useBoms();
  const { data: products } = useProducts();

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<BoM | null>(null);

  const productName = useMemo(() => {
    const map = new Map((products ?? []).map((p) => [p.id, p.name]));
    return (id: number) => map.get(id) ?? `Product #${id}`;
  }, [products]);

  const columns: Column<BoM>[] = [
    { id: "id", header: "ID", width: "70px", cell: (b) => <span className="font-medium text-on-surface-variant">#{b.id}</span> },
    {
      id: "finished",
      header: "Finished Product",
      cell: (b) => <span className="font-medium text-on-surface">{productName(b.finished_product_id)}</span>,
    },
    { id: "quantity", header: "Quantity", align: "right", cell: (b) => formatNumber(b.quantity) },
    { id: "components", header: "Components", align: "right", cell: (b) => b.components.length },
    { id: "operations", header: "Operations", align: "right", cell: (b) => b.operations.length },
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
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Bills of Materials"
        subtitle="Define how finished products are built from components and operations."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create BoM
          </Button>
        }
      />

      <div className="rounded-xl border border-outline-variant bg-surface shadow-sm">
        <DataTable
          columns={columns}
          data={data}
          rowKey={(b) => b.id}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(b) => setSelected(b)}
          emptyMessage="No bills of materials yet. Create one to enable manufacturing."
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
        A product with a BoM can be produced via a Manufacturing Order or auto-manufactured on a
        sales shortage.
      </p>
    </div>
  );
}
