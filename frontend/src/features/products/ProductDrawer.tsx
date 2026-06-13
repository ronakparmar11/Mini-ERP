import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProduct, useDeleteProduct, useUpdateProduct } from "@/features/products/hooks";
import { PROCUREMENT_META } from "@/features/products/productUtils";
import type { Product } from "@/types/product";
import { getApiErrorMessage } from "@/utils/apiError";
import { formatNumber } from "@/utils/format";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sales_price: z.coerce.number().min(0, "Must be ≥ 0"),
  cost_price: z.coerce.number().min(0, "Must be ≥ 0"),
  on_hand_qty: z.coerce.number().min(0, "Must be ≥ 0"),
  procurement_method: z.enum(["PURCHASE", "MANUFACTURE"]),
  procure_on_demand: z.boolean(),
  vendor_id: z
    .union([z.coerce.number().int().positive(), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v == null ? null : Number(v))),
});

type FormValues = z.input<typeof schema>;

interface ProductDrawerProps {
  open: boolean;
  /** null = create mode; a product = edit mode. */
  product: Product | null;
  onClose: () => void;
}

export function ProductDrawer({ open, product, onClose }: ProductDrawerProps) {
  const isEdit = product !== null;
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Re-seed the form whenever the drawer target changes.
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    reset({
      name: product?.name ?? "",
      sales_price: product?.sales_price ?? 0,
      cost_price: product?.cost_price ?? 0,
      on_hand_qty: product?.on_hand_qty ?? 0,
      procurement_method: product?.procurement_method ?? "PURCHASE",
      procure_on_demand: product?.procure_on_demand ?? false,
      vendor_id: product?.vendor_id ?? "",
    });
  }, [open, product, reset]);

  if (!open) return null;

  const onSubmit = handleSubmit(async (raw) => {
    const values = schema.parse(raw); // applies coercions/transforms
    try {
      if (isEdit && product) {
        await updateMut.mutateAsync({
          id: product.id,
          body: {
            name: values.name,
            sales_price: values.sales_price,
            cost_price: values.cost_price,
            procurement_method: values.procurement_method,
            procure_on_demand: values.procure_on_demand,
            vendor_id: values.vendor_id,
          },
        });
        toast.success(`Updated "${values.name}"`);
      } else {
        await createMut.mutateAsync({
          name: values.name,
          sales_price: values.sales_price,
          cost_price: values.cost_price,
          on_hand_qty: values.on_hand_qty,
          procurement_method: values.procurement_method,
          procure_on_demand: values.procure_on_demand,
          vendor_id: values.vendor_id,
        });
        toast.success(`Created "${values.name}"`);
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  });

  const onDelete = async () => {
    if (!product) return;
    try {
      await deleteMut.mutateAsync(product.id);
      toast.success(`Deleted "${product.name}"`);
      onClose();
    } catch (err) {
      // Backend returns 409 if the product still holds stock/reservations.
      toast.error(getApiErrorMessage(err));
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#0b1c30]/40 backdrop-blur-sm" onClick={onClose} />

      <div className="pointer-events-auto relative flex h-full w-full max-w-md animate-fade-in flex-col border-l border-outline-variant bg-surface-container-lowest shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <h3 className="text-title-sm text-on-background">{isEdit ? "Edit Product" : "New Product"}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form id="product-form" onSubmit={onSubmit} className="flex-1 space-y-6 overflow-y-auto p-4">
          {isEdit && product && (
            <div className="grid grid-cols-3 gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <ReadStat label="On Hand" value={formatNumber(product.on_hand_qty)} accent="text-on-background" />
              <ReadStat label="Reserved" value={formatNumber(product.reserved_qty)} accent="text-on-surface-variant" />
              <ReadStat label="Free" value={formatNumber(product.free_to_use_qty)} accent="text-tertiary-container" />
              <p className="col-span-3 text-[11px] text-on-surface-variant">
                Stock changes only through Purchase, Manufacturing or Delivery flows.
              </p>
            </div>
          )}

          <Section title="General Information">
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sales_price">Sales Price</Label>
                <Input id="sales_price" type="number" step="0.01" {...register("sales_price")} />
                {errors.sales_price && <FieldError>{errors.sales_price.message}</FieldError>}
              </div>
              <div>
                <Label htmlFor="cost_price">Cost Price</Label>
                <Input id="cost_price" type="number" step="0.01" {...register("cost_price")} />
                {errors.cost_price && <FieldError>{errors.cost_price.message}</FieldError>}
              </div>
            </div>
          </Section>

          <Section title="Inventory & Procurement">
            {!isEdit && (
              <div>
                <Label htmlFor="on_hand_qty">Opening On-Hand Quantity</Label>
                <Input id="on_hand_qty" type="number" step="0.001" {...register("on_hand_qty")} />
                {errors.on_hand_qty && <FieldError>{errors.on_hand_qty.message}</FieldError>}
              </div>
            )}
            <div>
              <Label htmlFor="procurement_method">Procurement Route</Label>
              <select
                id="procurement_method"
                {...register("procurement_method")}
                className="block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="PURCHASE">{PROCUREMENT_META.PURCHASE.label}</option>
                <option value="MANUFACTURE">{PROCUREMENT_META.MANUFACTURE.label}</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                {...register("procure_on_demand")}
                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span className="text-body-sm text-on-surface">
                Procure on demand (auto PO/MO on sales shortage)
              </span>
            </label>
            <div>
              <Label htmlFor="vendor_id">Default Vendor ID (optional)</Label>
              <Input id="vendor_id" type="number" placeholder="e.g. 3" {...register("vendor_id")} />
            </div>
          </Section>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-outline-variant bg-surface p-4">
          <div>
            {isEdit &&
              (confirmDelete ? (
                <div className="flex items-center gap-2">
                  <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleteMut.isPending}>
                    {deleteMut.isPending ? "Deleting…" : "Confirm"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-error">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="product-form" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h4 className="border-b border-outline-variant pb-1 text-label-upper uppercase text-on-surface-variant">
        {title}
      </h4>
      {children}
    </div>
  );
}

function ReadStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase text-on-surface-variant">{label}</div>
      <div className={`text-title-sm ${accent}`}>{value}</div>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-body-sm text-error">{children}</p>;
}
