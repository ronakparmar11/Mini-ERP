import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { DrawerShell } from "@/components/common/DrawerShell";
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
  on_hand_qty: z.coerce.number().int().min(0, "Must be ≥ 0"),
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
  const { t } = useTranslation();
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
    const values = schema.parse(raw);
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
      toast.error(getApiErrorMessage(err));
      setConfirmDelete(false);
    }
  };

  const drawerTitle = isEdit ? t("products.editProduct") : t("products.newProduct");

  return (
    <DrawerShell open={open} onClose={onClose} label={drawerTitle}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <h3 className="text-title-sm text-on-background">{drawerTitle}</h3>
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
              <ReadStat label={t("products.onHand")} value={formatNumber(product.on_hand_qty)} accent="text-on-background" />
              <ReadStat label={t("products.reserved")} value={formatNumber(product.reserved_qty)} accent="text-on-surface-variant" />
              <ReadStat label={t("products.free")} value={formatNumber(product.free_to_use_qty)} accent="text-tertiary-container" />
              <p className="col-span-3 text-[11px] text-on-surface-variant">
                {t("products.stockChangesNote")}
              </p>
            </div>
          )}

          <Section title={t("products.generalInformation")}>
            <div>
              <Label htmlFor="name">{t("products.productName")}</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sales_price">{t("products.salesPrice")}</Label>
                <Input id="sales_price" type="number" step="0.01" {...register("sales_price")} />
                {errors.sales_price && <FieldError>{errors.sales_price.message}</FieldError>}
              </div>
              <div>
                <Label htmlFor="cost_price">{t("products.costPrice")}</Label>
                <Input id="cost_price" type="number" step="0.01" {...register("cost_price")} />
                {errors.cost_price && <FieldError>{errors.cost_price.message}</FieldError>}
              </div>
            </div>
          </Section>

          <Section title={t("products.inventoryProcurement")}>
            {!isEdit && (
              <div>
                <Label htmlFor="on_hand_qty">{t("products.openingOnHand")}</Label>
                <Input id="on_hand_qty" type="number" step="1" {...register("on_hand_qty")} />
                {errors.on_hand_qty && <FieldError>{errors.on_hand_qty.message}</FieldError>}
              </div>
            )}
            <div>
              <Label htmlFor="procurement_method">{t("products.procurementRoute")}</Label>
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
                {t("products.procureOnDemand")}
              </span>
            </label>
            <div>
              <Label htmlFor="vendor_id">{t("products.defaultVendorId")}</Label>
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
                    {deleteMut.isPending ? t("products.deleting") : t("products.confirmDelete")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-error">
                  <Trash2 className="h-4 w-4" />
                  {t("common.delete")}
                </Button>
              ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="product-form" size="sm" disabled={isSubmitting}>
              {isSubmitting ? t("products.saving") : isEdit ? t("products.saveChanges") : t("products.createProduct")}
            </Button>
          </div>
        </div>
    </DrawerShell>
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
