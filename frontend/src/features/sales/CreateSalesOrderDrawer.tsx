import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { DrawerShell } from "@/components/common/DrawerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/features/products/hooks";
import { useCreateSalesOrder, useImportSalesOrderPdf } from "@/features/sales/hooks";
import { SalesLineEditor, type SalesLineDraft, blankLine } from "@/features/sales/SalesLineEditor";
import type { ImportedOrder, SalesOrderCreate } from "@/types/sales";
import { getFriendlyError } from "@/utils/apiError";
import { formatCurrency } from "@/utils/format";

const customerSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  customer_address: z.string().optional(),
  salesperson: z.string().optional(),
});

type CustomerValues = z.infer<typeof customerSchema>;

export function CreateSalesOrderDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const createMut = useCreateSalesOrder();
  const importMut = useImportSalesOrderPdf();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      reset({ customer_name: "", customer_email: "", customer_address: "", salesperson: "" });
      setLines([blankLine()]);
      setLineError(null);
    }
  }, [open, reset]);

  if (!open) return null;

  const applyImported = (data: ImportedOrder) => {
    reset({
      customer_name: data.customer_name ?? "",
      customer_email: data.email ?? "",
      customer_address: data.address ?? "",
      salesperson: "",
    });
    const byId = new Map((products ?? []).map((p) => [p.id, p]));
    const drafts: SalesLineDraft[] = data.items.map((it) => {
      const matched = it.matched_product_id != null ? byId.get(it.matched_product_id) : undefined;
      return {
        key: crypto.randomUUID(),
        product_id: matched ? matched.id : "",
        ordered_quantity: String(it.quantity || 1),
        sales_price: matched ? String(matched.sales_price) : "",
      };
    });
    setLines(drafts.length > 0 ? drafts : [blankLine()]);
    setLineError(null);
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = await importMut.mutateAsync(file);
      applyImported(data);
      const unmatched = data.items.filter((i) => i.matched_product_id == null).length;
      toast.success(
        `Extracted ${data.items.length} item${data.items.length === 1 ? "" : "s"}. ` +
          (unmatched ? `${unmatched} need a product — review below.` : "Review and create."),
      );
    } catch (err) {
      toast.error(getFriendlyError(err));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const estimatedTotal = lines.reduce(
    (sum, l) => sum + (Number(l.ordered_quantity) || 0) * (Number(l.sales_price) || 0),
    0,
  );

  const onSubmit = handleSubmit(async (customer) => {
    const validLines = lines.filter((l) => l.product_id !== "" && Number(l.ordered_quantity) > 0);
    if (validLines.length === 0) {
      setLineError(t("sales.addAtLeastOneLine"));
      return;
    }
    setLineError(null);

    const body: SalesOrderCreate = {
      customer_name: customer.customer_name,
      customer_email: customer.customer_email || null,
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
      toast.error(getFriendlyError(err));
    }
  });

  return (
    <DrawerShell open={open} onClose={onClose} label={t("sales.newSalesOrder")}>
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <h3 className="text-title-sm text-on-background">{t("sales.newSalesOrder")}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* AI-assisted import */}
        <div className="border-b border-outline-variant bg-secondary-container/40 p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-body-md font-semibold text-on-surface">
                <Sparkles className="h-4 w-4 text-primary" />
                {t("sales.importFromPdf")}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {t("sales.aiExtractHint")}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMut.isPending}
            >
              {importMut.isPending ? t("sales.extracting") : t("sales.uploadPdf")}
            </Button>
          </div>
        </div>

        <form id="so-form" onSubmit={onSubmit} className="flex-1 space-y-6 overflow-y-auto p-4">
          <div className="space-y-4">
            <h4 className="border-b border-outline-variant pb-1 text-label-upper uppercase text-on-surface-variant">
              {t("sales.customerSection")}
            </h4>
            <div>
              <Label htmlFor="customer_name">{t("sales.customerName")}</Label>
              <Input id="customer_name" {...register("customer_name")} />
              {errors.customer_name && (
                <p className="mt-1 text-body-sm text-error">{errors.customer_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="customer_email">{t("sales.customerEmail")}</Label>
              <Input id="customer_email" type="email" {...register("customer_email")} />
              {errors.customer_email && (
                <p className="mt-1 text-body-sm text-error">{errors.customer_email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="customer_address">{t("sales.customerAddress")}</Label>
              <Input id="customer_address" {...register("customer_address")} />
            </div>
            <div>
              <Label htmlFor="salesperson">{t("sales.salesperson")}</Label>
              <Input id="salesperson" {...register("salesperson")} />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="border-b border-outline-variant pb-1 text-label-upper uppercase text-on-surface-variant">
              {t("sales.orderLines")}
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
            {t("sales.estimatedTotal")} <span className="font-semibold text-on-surface">{formatCurrency(estimatedTotal)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="so-form" size="sm" disabled={createMut.isPending}>
              {createMut.isPending ? t("sales.creating") : t("sales.createOrder")}
            </Button>
          </div>
        </div>
    </DrawerShell>
  );
}
