import { Download, Eye, FileText, Send } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { SectionCard } from "@/components/common/SectionCard";
import { LoadingState } from "@/components/common/StateViews";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  useGenerateInvoice,
  useInvoices,
  useSendInvoice,
} from "@/features/invoices/hooks";
import { INVOICE_STATUS_META, downloadInvoiceFile } from "@/features/invoices/invoiceUtils";
import { getFriendlyError } from "@/utils/apiError";
import { formatCurrency, formatDateTime } from "@/utils/format";

export function InvoiceBillingPanel({ salesOrderId }: { salesOrderId: number }) {
  const { t } = useTranslation();
  const { data: invoices, isLoading } = useInvoices();
  const invoice = useMemo(
    () => (invoices ?? []).find((inv) => inv.sales_order_id === salesOrderId) ?? null,
    [invoices, salesOrderId],
  );

  const generateMut = useGenerateInvoice(salesOrderId);
  const sendMut = useSendInvoice(invoice?.id ?? 0);

  const onGenerate = async () => {
    try {
      const inv = await generateMut.mutateAsync();
      toast.success(`Invoice ${inv.invoice_number} generated successfully.`);
    } catch (err) {
      toast.error(getFriendlyError(err));
    }
  };

  const onSend = async () => {
    if (!invoice) return;
    try {
      await sendMut.mutateAsync();
      toast.success("Invoice emailed successfully.");
    } catch (err) {
      toast.error(getFriendlyError(err));
    }
  };

  return (
    <SectionCard title={t("invoices.invoiceBilling")}>
      {isLoading ? (
        <LoadingState className="py-8" />
      ) : !invoice ? (
        // Scenario A — recommend invoicing.
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-secondary-container p-2 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-title-sm text-on-surface">
                {t("invoices.readyForInvoicing")}
              </h4>
              <p className="text-body-sm text-on-surface-variant">
                {t("invoices.generateToStart")}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={onGenerate} disabled={generateMut.isPending} className="shrink-0">
            <FileText className="h-4 w-4" />
            {generateMut.isPending ? t("invoices.generating") : t("invoices.generateInvoice")}
          </Button>
        </div>
      ) : (
        // Scenario B — invoice exists.
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-title-sm font-semibold text-primary">{invoice.invoice_number}</span>
                <StatusBadge meta={INVOICE_STATUS_META[invoice.status]} />
              </div>
              <p className="text-body-sm text-on-surface-variant">
                {t("invoices.generated")} {formatDateTime(invoice.generated_at)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase text-on-surface-variant">{t("common.amount")}</div>
              <div className="text-title-sm font-bold text-on-surface">{formatCurrency(invoice.total_amount)}</div>
            </div>
          </div>

          <p className="text-body-sm text-on-surface-variant">
            {invoice.status === "SENT" ? t("invoices.invoiceEmailed") : t("invoices.reviewAndSend")}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link to={`/invoices/${invoice.id}`}>
                <Eye className="h-4 w-4" />
                {t("invoices.viewInvoice")}
              </Link>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => downloadInvoiceFile(invoice.id, invoice.invoice_number)}>
              <Download className="h-4 w-4" />
              {t("invoices.downloadPdf")}
            </Button>
            {invoice.status === "DRAFT" && (
              <Button size="sm" onClick={onSend} disabled={sendMut.isPending}>
                <Send className="h-4 w-4" />
                {sendMut.isPending ? t("invoices.sending") : t("invoices.sendEmail")}
              </Button>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
