import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { DrawerShell } from "@/components/common/DrawerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBoms } from "@/features/bom/hooks";
import { useProducts } from "@/features/products/hooks";
import { useCreateMO } from "@/features/manufacturing/hooks";
import type { ManufacturingOrderCreate } from "@/types/manufacturing";
import { getApiErrorMessage } from "@/utils/apiError";

const schema = z.object({
  bom_id: z.coerce.number().int().positive("Select a Bill of Materials"),
  quantity_to_produce: z.coerce.number().positive("Quantity must be greater than zero"),
  assignee: z.string().optional(),
  schedule_date: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CreateMODrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: boms, isLoading: loadingBoms } = useBoms();
  const { data: products } = useProducts();
  const createMut = useCreateMO();

  const productName = useMemo(() => {
    const map = new Map((products ?? []).map((p) => [p.id, p.name]));
    return (id: number) => map.get(id) ?? `Product #${id}`;
  }, [products]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset({ bom_id: undefined, quantity_to_produce: 1, assignee: "", schedule_date: "" });
  }, [open, reset]);

  if (!open) return null;

  const onSubmit = handleSubmit(async (values) => {
    const body: ManufacturingOrderCreate = {
      bom_id: values.bom_id,
      quantity_to_produce: values.quantity_to_produce,
      assignee: values.assignee || null,
      schedule_date: values.schedule_date ? values.schedule_date : null,
    };
    try {
      const created = await createMut.mutateAsync(body);
      toast.success(`Manufacturing order MO-${created.id} created`);
      onClose();
      navigate(`/manufacturing/${created.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  });

  return (
    <DrawerShell open={open} onClose={onClose} label="New Manufacturing Order">
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <h3 className="text-title-sm text-on-background">New Manufacturing Order</h3>
          <button onClick={onClose} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form id="mo-form" onSubmit={onSubmit} className="flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <Label htmlFor="bom_id">Bill of Materials</Label>
            <select
              id="bom_id"
              defaultValue=""
              {...register("bom_id")}
              className="block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="" disabled>
                {loadingBoms ? "Loading BoMs…" : "Select a BoM…"}
              </option>
              {(boms ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.id} — {productName(b.finished_product_id)}
                </option>
              ))}
            </select>
            {errors.bom_id && <p className="mt-1 text-body-sm text-error">{errors.bom_id.message}</p>}
            {!loadingBoms && (boms ?? []).length === 0 && (
              <p className="mt-1 text-body-sm text-on-surface-variant">
                No BoMs available — create one first.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="quantity_to_produce">Quantity to Produce</Label>
            <Input id="quantity_to_produce" type="number" min="0" step="0.001" {...register("quantity_to_produce")} />
            {errors.quantity_to_produce && (
              <p className="mt-1 text-body-sm text-error">{errors.quantity_to_produce.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="assignee">Assignee (optional)</Label>
            <Input id="assignee" {...register("assignee")} placeholder="e.g. Line A" />
          </div>

          <div>
            <Label htmlFor="schedule_date">Schedule Date (optional)</Label>
            <Input id="schedule_date" type="datetime-local" {...register("schedule_date")} />
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 border-t border-outline-variant bg-surface p-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="mo-form" size="sm" disabled={createMut.isPending}>
            {createMut.isPending ? "Creating…" : "Create MO"}
          </Button>
        </div>
    </DrawerShell>
  );
}
