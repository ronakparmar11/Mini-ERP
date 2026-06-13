import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/features/products/hooks";
import { useCreatePurchaseOrder } from "@/features/purchase/hooks";
import type { PurchaseOrderCreate } from "@/types/purchase";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatCurrency } from "@/utils/format";

const schema = z.object({
  vendor: z.string().min(1, "Vendor is required"),
  responsible_person: z.string().optional(),
});
type Values = z.infer<typeof schema>;

interface LineDraft {
  key: string;
  product_id: number | "";
  ordered_quantity: string;
  cost_price: string;
}
const newLine = (): LineDraft => ({ key: crypto.randomUUID(), product_id: "", ordered_quantity: "1", cost_price: "" });

export function CreatePurchaseOrderDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const createMut = useCreatePurchaseOrder();

  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [lineError, setLineError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({ vendor: "", responsible_person: "" });
      setLines([newLine()]);
      setLineError(null);
    }
  }, [open, reset]);

  if (!open) return null;

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const estTotal = lines.reduce((s, l) => s + (Number(l.ordered_quantity) || 0) * (Number(l.cost_price) || 0), 0);

  const patch = (key: string, p: Partial<LineDraft>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)));

  const onSubmit = handleSubmit(async (vals) => {
    const valid = lines.filter((l) => l.product_id !== "" && Number(l.ordered_quantity) > 0);
    if (valid.length === 0) {
      setLineError("Add at least one line with a product and quantity greater than zero.");
      return;
    }
    setLineError(null);
    const body: PurchaseOrderCreate = {
      vendor: vals.vendor,
      responsible_person: vals.responsible_person || null,
      lines: valid.map((l) => ({
        product_id: Number(l.product_id),
        ordered_quantity: Number(l.ordered_quantity),
        cost_price: l.cost_price === "" ? null : Number(l.cost_price),
      })),
    };
    try {
      const created = await createMut.mutateAsync(body);
      toast.success(`Purchase order PO-${created.id} created`);
      onClose();
      navigate(`/purchase-orders/${created.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="pointer-events-auto relative flex h-full w-full max-w-md animate-fade-in flex-col border-l border-outline-variant bg-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <h3 className="text-title-sm text-on-background">New Purchase Order</h3>
          <button onClick={onClose} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form id="po-form" onSubmit={onSubmit} className="flex-1 space-y-6 overflow-y-auto p-4">
          <div className="space-y-4">
            <h4 className="border-b border-outline-variant pb-1 text-label-upper uppercase text-on-surface-variant">Vendor</h4>
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Input id="vendor" {...register("vendor")} placeholder="e.g. Acme Supplies" />
              {errors.vendor && <p className="mt-1 text-body-sm text-error">{errors.vendor.message}</p>}
            </div>
            <div>
              <Label htmlFor="responsible_person">Responsible Person (optional)</Label>
              <Input id="responsible_person" {...register("responsible_person")} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant pb-1">
              <h4 className="text-label-upper uppercase text-on-surface-variant">Lines</h4>
              <button type="button" onClick={() => setLines((l) => [...l, newLine()])} className="flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline">
                <Plus className="h-4 w-4" /> Add line
              </button>
            </div>
            {lines.map((l) => {
              return (
                <div key={l.key} className="rounded-lg border border-outline-variant bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <select
                      value={l.product_id}
                      onChange={(e) => {
                        const id = e.target.value === "" ? "" : Number(e.target.value);
                        const prod = typeof id === "number" ? byId.get(id) : undefined;
                        patch(l.key, { product_id: id, cost_price: prod ? String(prod.cost_price) : "" });
                      }}
                      className="mr-2 block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="" disabled>{loadingProducts ? "Loading…" : "Select product…"}</option>
                      {(products ?? []).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))} disabled={lines.length === 1} className="text-on-surface-variant hover:text-error disabled:opacity-30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-on-surface-variant">Quantity</label>
                      <Input type="number" min="0" step="0.001" value={l.ordered_quantity} onChange={(e) => patch(l.key, { ordered_quantity: e.target.value })} className="py-2" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-on-surface-variant">Cost Price</label>
                      <Input type="number" min="0" step="0.01" value={l.cost_price} onChange={(e) => patch(l.key, { cost_price: e.target.value })} className="py-2" />
                    </div>
                  </div>
                  <div className="mt-2 text-right text-body-sm font-semibold text-on-surface">
                    {formatCurrency((Number(l.ordered_quantity) || 0) * (Number(l.cost_price) || 0))}
                  </div>
                </div>
              );
            })}
            {lineError && <p className="text-body-sm text-error">{lineError}</p>}
          </div>
        </form>

        <div className="flex items-center justify-between gap-2 border-t border-outline-variant bg-surface p-4">
          <div className="text-body-sm text-on-surface-variant">
            Est. total <span className="font-semibold text-on-surface">{formatCurrency(estTotal)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="po-form" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create PO"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
