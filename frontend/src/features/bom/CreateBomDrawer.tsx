import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateBom } from "@/features/bom/hooks";
import { useProducts } from "@/features/products/hooks";
import type { BoMCreate } from "@/types/bom";
import { getApiErrorMessage } from "@/utils/apiError";

const scalarSchema = z.object({
  finished_product_id: z.coerce.number().int().positive("Select a finished product"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
});
type ScalarValues = z.infer<typeof scalarSchema>;

interface ComponentDraft {
  key: string;
  component_product_id: number | "";
  quantity_required: string;
}
interface OperationDraft {
  key: string;
  work_center: string;
  expected_duration: string;
}

const newComponent = (): ComponentDraft => ({
  key: crypto.randomUUID(),
  component_product_id: "",
  quantity_required: "1",
});
const newOperation = (): OperationDraft => ({
  key: crypto.randomUUID(),
  work_center: "",
  expected_duration: "0",
});

export function CreateBomDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: products, isLoading: loadingProducts } = useProducts();
  const createMut = useCreateBom();

  const [components, setComponents] = useState<ComponentDraft[]>([newComponent()]);
  const [operations, setOperations] = useState<OperationDraft[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScalarValues>({ resolver: zodResolver(scalarSchema) });

  useEffect(() => {
    if (open) {
      reset({ finished_product_id: undefined, quantity: 1 });
      setComponents([newComponent()]);
      setOperations([]);
      setListError(null);
    }
  }, [open, reset]);

  if (!open) return null;

  const onSubmit = handleSubmit(async (scalar) => {
    const validComponents = components.filter(
      (c) => c.component_product_id !== "" && Number(c.quantity_required) > 0,
    );
    if (validComponents.length === 0) {
      setListError("Add at least one component with a quantity greater than zero.");
      return;
    }
    const validOperations = operations.filter((o) => o.work_center.trim() !== "");
    setListError(null);

    const body: BoMCreate = {
      finished_product_id: scalar.finished_product_id,
      quantity: scalar.quantity,
      components: validComponents.map((c) => ({
        component_product_id: Number(c.component_product_id),
        quantity_required: Number(c.quantity_required),
      })),
      operations: validOperations.map((o) => ({
        work_center: o.work_center.trim(),
        expected_duration: Number(o.expected_duration) || 0,
      })),
    };

    try {
      const created = await createMut.mutateAsync(body);
      toast.success(`Bill of Materials #${created.id} created`);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="pointer-events-auto relative flex h-full w-full max-w-lg animate-fade-in flex-col border-l border-outline-variant bg-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <h3 className="text-title-sm text-on-background">New Bill of Materials</h3>
          <button onClick={onClose} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form id="bom-form" onSubmit={onSubmit} className="flex-1 space-y-6 overflow-y-auto p-4">
          {/* Section 1 — finished product */}
          <section className="space-y-4">
            <h4 className="border-b border-outline-variant pb-1 text-label-upper uppercase text-on-surface-variant">
              Finished Product
            </h4>
            <div>
              <Label htmlFor="finished_product_id">Product</Label>
              <select
                id="finished_product_id"
                {...register("finished_product_id")}
                defaultValue=""
                className="block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="" disabled>
                  {loadingProducts ? "Loading…" : "Select finished product…"}
                </option>
                {(products ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.finished_product_id && (
                <p className="mt-1 text-body-sm text-error">{errors.finished_product_id.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="quantity">Quantity Produced (per batch)</Label>
              <Input id="quantity" type="number" min="0" step="0.001" {...register("quantity")} />
              {errors.quantity && <p className="mt-1 text-body-sm text-error">{errors.quantity.message}</p>}
            </div>
          </section>

          {/* Section 2 — components */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant pb-1">
              <h4 className="text-label-upper uppercase text-on-surface-variant">Components</h4>
              <button
                type="button"
                onClick={() => setComponents((c) => [...c, newComponent()])}
                className="flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
              >
                <Plus className="h-4 w-4" /> Add Component
              </button>
            </div>
            {components.map((c, i) => (
              <div key={c.key} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] text-on-surface-variant">Product</label>
                  <select
                    value={c.component_product_id}
                    onChange={(e) =>
                      setComponents((prev) =>
                        prev.map((x) =>
                          x.key === c.key
                            ? { ...x, component_product_id: e.target.value === "" ? "" : Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                    className="block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {(products ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-[11px] text-on-surface-variant">Qty Req.</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={c.quantity_required}
                    onChange={(e) =>
                      setComponents((prev) =>
                        prev.map((x) => (x.key === c.key ? { ...x, quantity_required: e.target.value } : x)),
                      )
                    }
                    className="py-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setComponents((prev) => prev.filter((x) => x.key !== c.key))}
                  disabled={components.length === 1}
                  className="mb-1.5 text-on-surface-variant hover:text-error disabled:opacity-30"
                  aria-label={`Remove component ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {listError && <p className="text-body-sm text-error">{listError}</p>}
          </section>

          {/* Section 3 — operations */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant pb-1">
              <h4 className="text-label-upper uppercase text-on-surface-variant">Operations (optional)</h4>
              <button
                type="button"
                onClick={() => setOperations((o) => [...o, newOperation()])}
                className="flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
              >
                <Plus className="h-4 w-4" /> Add Operation
              </button>
            </div>
            {operations.length === 0 && (
              <p className="text-body-sm text-on-surface-variant">No operations defined.</p>
            )}
            {operations.map((o, i) => (
              <div key={o.key} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] text-on-surface-variant">Work Center</label>
                  <Input
                    value={o.work_center}
                    placeholder="e.g. Assembly"
                    onChange={(e) =>
                      setOperations((prev) =>
                        prev.map((x) => (x.key === o.key ? { ...x, work_center: e.target.value } : x)),
                      )
                    }
                    className="py-2"
                  />
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-[11px] text-on-surface-variant">Duration (min)</label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={o.expected_duration}
                    onChange={(e) =>
                      setOperations((prev) =>
                        prev.map((x) => (x.key === o.key ? { ...x, expected_duration: e.target.value } : x)),
                      )
                    }
                    className="py-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setOperations((prev) => prev.filter((x) => x.key !== o.key))}
                  className="mb-1.5 text-on-surface-variant hover:text-error"
                  aria-label={`Remove operation ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </section>
        </form>

        <div className="flex items-center justify-end gap-2 border-t border-outline-variant bg-surface p-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="bom-form" size="sm" disabled={createMut.isPending}>
            {createMut.isPending ? "Creating…" : "Create BoM"}
          </Button>
        </div>
      </div>
    </div>
  );
}
