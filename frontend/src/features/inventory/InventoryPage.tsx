import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { MovementBadge } from "@/components/common/MovementBadge";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { useProducts } from "@/features/products/hooks";
import { useMovements } from "@/features/inventory/hooks";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { InventoryMovement, MovementType, ReferenceType } from "@/types/inventory";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/format";
import { MOVEMENT_META, referenceLabel, signedQuantity } from "@/utils/movements";

const MOVEMENT_TYPES: MovementType[] = [
  "SALE_RESERVATION",
  "SALE_DELIVERY",
  "PURCHASE_RECEIPT",
  "MO_CONSUMPTION",
  "MO_PRODUCTION",
];
const REFERENCE_TYPES: ReferenceType[] = ["SALES_ORDER", "PURCHASE_ORDER", "MANUFACTURING_ORDER"];

const selectClass =
  "rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export function InventoryPage() {
  const { data, isLoading, error, refetch } = useMovements();
  const { data: products } = useProducts();

  const [movementType, setMovementType] = useState<MovementType | "ALL">("ALL");
  const [referenceType, setReferenceType] = useState<ReferenceType | "ALL">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), 300);

  const productName = useMemo(() => {
    const map = new Map((products ?? []).map((p) => [p.id, p.name]));
    return (id: number) => map.get(id) ?? `Product #${id}`;
  }, [products]);

  const rows = useMemo(() => {
    return (data ?? []).filter((m) => {
      if (movementType !== "ALL" && m.movement_type !== movementType) return false;
      if (referenceType !== "ALL" && m.reference_type !== referenceType) return false;
      if (search && !productName(m.product_id).toLowerCase().includes(search)) return false;
      return true;
    });
  }, [data, movementType, referenceType, search, productName]);

  const columns: Column<InventoryMovement>[] = [
    {
      id: "timestamp",
      header: "Timestamp",
      cell: (m) => <span className="text-on-surface-variant">{formatDateTime(m.timestamp)}</span>,
    },
    {
      id: "product",
      header: "Product",
      cell: (m) => <span className="font-medium text-on-surface">{productName(m.product_id)}</span>,
    },
    { id: "movement", header: "Movement Type", cell: (m) => <MovementBadge type={m.movement_type} /> },
    {
      id: "reference",
      header: "Reference",
      cell: (m) => (
        <span className="font-medium text-primary">{referenceLabel(m.reference_type, m.reference_id)}</span>
      ),
    },
    {
      id: "refId",
      header: "Ref ID",
      align: "right",
      cell: (m) => <span className="text-on-surface-variant">#{m.reference_id}</span>,
    },
    {
      id: "quantity",
      header: "Quantity",
      align: "right",
      cell: (m) => {
        const dir = MOVEMENT_META[m.movement_type].direction;
        return (
          <span
            className={cn(
              "font-semibold",
              dir === "in" && "text-tertiary-container",
              dir === "out" && "text-error",
              dir === "neutral" && "text-on-surface-variant",
            )}
          >
            {signedQuantity(dir, Number(m.quantity))}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Inventory Movements"
        subtitle="Immutable stock ledger — every reservation, receipt, consumption and production."
      />

      <div className="flex flex-col rounded-xl border border-outline-variant bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant p-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search product…"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-10 pr-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select className={selectClass} value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType | "ALL")}>
            <option value="ALL">All movement types</option>
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {MOVEMENT_META[t].label}
              </option>
            ))}
          </select>
          <select className={selectClass} value={referenceType} onChange={(e) => setReferenceType(e.target.value as ReferenceType | "ALL")}>
            <option value="ALL">All references</option>
            {REFERENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
          <span className="ml-auto px-1 text-[12px] text-on-surface-variant">{rows.length} movements</span>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(m) => m.id}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          emptyMessage="No inventory movements match these filters."
        />
      </div>
    </div>
  );
}
