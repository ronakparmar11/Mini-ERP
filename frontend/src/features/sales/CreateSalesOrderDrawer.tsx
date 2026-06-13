import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/features/products/hooks";
import { useCreateSalesOrder } from "@/features/sales/hooks";
import { SalesLineEditor, type SalesLineDraft, blankLine } from "@/features/sales/SalesLineEditor";
import type { SalesOrderCreate } from "@/types/sales";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatCurrency } from "@/utils/format";

const customerSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_address: z.string().optional(),
  salesperson: z.string().optional(),
});

type CustomerValues = z.infer<typeof customerSchema>;

export function CreateSalesOrderDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const createMut = useCreateSalesOrder();

  const [lines, setLines] = useState<SalesLineDraft[]>([blankLine()]);
  const [lineError, setLineError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerValues>({ resolver: zodResolver(customerSchema) });

  useEffect(() => {
    if (open) {
      reset({ customer_name: "", customer_address: "", salesperson: "" });
      setLines([blankLine()]);
      setLineError(null);
    }
  }, [open, reset]);

  if (!open) return null;

  const estimatedTotal = lines.reduce(
    (sum, l) => sum + (Number(l.ordered_quantity) || 0) * (Number(l.sales_price) || 0),
    0,
  );

  const onSubmit = handleSubmit(async (customer) => {
    const validLines = lines.filter((l) => l.product_id !== "" && Number(l.ordered_quantity) > 0);
    if (validLines.length === 0) {
      setLineError("Add at least one line with a product and quantity greater than zero.");
      return;
    }
    setLineError(null);

    const body: SalesOrderCreate = {
      customer_name: customer.customer_name,
      customer_address: customer.customer_address || null,
      salesperson: customer.salesperson || null,
      lines: validLines.map((l) => ({
        product_id: Number(l.product_id),
        ordered_quantity: Number(l.ordered_quantity),
        sales_price: l.sales_price === "" ? null : Number(l.sales_price),
      })),
    };

    try {
      const created = await createMut.mutateAsync(body);
      toast.success(`Sales order SO-${created.id} created`);
      onClose();
      navigate(`/sales/${created.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="pointer-events-auto relative flex h-full w-full max-w-md animate-fade-in flex-col border-l border-outline-variant bg-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <h3 className="text-title-sm text-on-background">New Sales Order</h3>
          <button onClick={onClose} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form id="so-form" onSubmit={onSubmit} className="flex-1 space-y-6 overflow-y-auto p-4">
          <div className="space-y-4">
            <h4 className="border-b border-outline-variant pb-1 text-label-upper uppercase text-on-surface-variant">
              Customer
            </h4>
            <div>
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input id="customer_name" {...register("customer_name")} />
              {errors.customer_name && (
                <p className="mt-1 text-body-sm text-error">{errors.customer_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="customer_address">Address (optional)</Label>
              <Input id="customer_address" {...register("customer_address")} />
            </div>
            <div>
              <Label htmlFor="salesperson">Salesperson (optional)</Label>
              <Input id="salesperson" {...register("salesperson")} />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="border-b border-outline-variant pb-1 text-label-upper uppercase text-on-surface-variant">
              Order Lines
            </h4>
            <SalesLineEditor
              lines={lines}
              onChange={setLines}
              products={products ?? []}
              isLoadingProducts={loadingProducts}
            />
            {lineError && <p className="text-body-sm text-error">{lineError}</p>}
          </div>
        </form>

        <div className="flex items-center justify-between gap-2 border-t border-outline-variant bg-surface p-4">
          <div className="text-body-sm text-on-surface-variant">
            Est. total <span className="font-semibold text-on-surface">{formatCurrency(estimatedTotal)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="so-form" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create Order"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
