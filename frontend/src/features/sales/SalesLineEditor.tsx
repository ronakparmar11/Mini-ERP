import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/types/product";
import { formatCurrency, formatNumber } from "@/utils/format";

export interface SalesLineDraft {
  key: string;
  product_id: number | "";
  ordered_quantity: string;
  sales_price: string;
}

export const blankLine = (): SalesLineDraft => ({
  key: crypto.randomUUID(),
  product_id: "",
  ordered_quantity: "1",
  sales_price: "",
});

interface SalesLineEditorProps {
  lines: SalesLineDraft[];
  onChange: (lines: SalesLineDraft[]) => void;
  products: Product[];
  isLoadingProducts?: boolean;
}

/**
 * Reusable editor for sales order lines. Surfaces inventory availability and
 * procurement intent per line so the user understands what confirmation will do
 * (reserve vs. auto-create PO/MO) before submitting — the inventory-first story.
 */
export function SalesLineEditor({ lines, onChange, products, isLoadingProducts }: SalesLineEditorProps) {
  const byId = new Map(products.map((p) => [p.id, p]));

  const update = (key: string, patch: Partial<SalesLineDraft>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const remove = (key: string) => onChange(lines.filter((l) => l.key !== key));

  const onPickProduct = (key: string, value: string) => {
    const id = value === "" ? "" : Number(value);
    const product = typeof id === "number" ? byId.get(id) : undefined;
    // Auto-fill the unit price from the product when (re)selecting.
    update(key, {
      product_id: id,
      sales_price: product ? String(product.sales_price) : "",
    });
  };

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        const product = typeof line.product_id === "number" ? byId.get(line.product_id) : undefined;
        const qty = Number(line.ordered_quantity) || 0;
        const price = Number(line.sales_price) || 0;
        const subtotal = qty * price;

        return (
          <div key={line.key} className="rounded-lg border border-outline-variant bg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-label-upper uppercase text-on-surface-variant">Line {idx + 1}</span>
              <button
                type="button"
                onClick={() => remove(line.key)}
                disabled={lines.length === 1}
                className="text-on-surface-variant transition-colors hover:text-error disabled:opacity-30"
                aria-label="Remove line"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <select
              value={line.product_id}
              onChange={(e) => onPickProduct(line.key, e.target.value)}
              className="mb-2 block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="" disabled>
                {isLoadingProducts ? "Loading products…" : "Select a product…"}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-on-surface-variant">Quantity</label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={line.ordered_quantity}
                  onChange={(e) => update(line.key, { ordered_quantity: e.target.value })}
                  className="py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-on-surface-variant">Unit Price</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.sales_price}
                  onChange={(e) => update(line.key, { sales_price: e.target.value })}
                  className="py-2"
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              {product ? (
                <AvailabilityHint product={product} qty={qty} />
              ) : (
                <span className="text-[11px] text-on-surface-variant">Pick a product</span>
              )}
              <span className="text-body-sm font-semibold text-on-surface">
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...lines, blankLine()])}>
        <Plus className="h-4 w-4" />
        Add line
      </Button>
    </div>
  );
}

function AvailabilityHint({ product, qty }: { product: Product; qty: number }) {
  const free = Number(product.free_to_use_qty);
  if (qty <= free) {
    return <Badge tone="success">{formatNumber(free)} free · in stock</Badge>;
  }
  const shortage = qty - free;
  if (product.procure_on_demand) {
    return (
      <Badge tone="info" title={`Auto ${product.procurement_method.toLowerCase()} on confirm`}>
        Short {formatNumber(shortage)} · auto-procure
      </Badge>
    );
  }
  return <Badge tone="warning">Short {formatNumber(shortage)} · reserve partial</Badge>;
}
