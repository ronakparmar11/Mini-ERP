import { ChevronRight, Download, Mail, Send } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { InlineAlert } from "@/components/common/InlineAlert";
import { Modal } from "@/components/common/Modal";
import { SectionCard } from "@/components/common/SectionCard";
import { ErrorState, LoadingState } from "@/components/common/StateViews";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useInvoice, useSendInvoice } from "@/features/invoices/hooks";
import { INVOICE_STATUS_META, downloadInvoiceFile } from "@/features/invoices/invoiceUtils";
import { getFriendlyError } from "@/utils/apiError";
import { formatCurrency, formatDateTime, formatNumber } from "@/utils/format";

export function InvoiceDetailPage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const { data: invoice, isLoading, error, refetch } = useInvoice(id);
  const sendMut = useSendInvoice(id);

  const [showSend, setShowSend] = useState(false);
  const [sendAlert, setSendAlert] = useState<string | null>(null);

  if (isLoading) return <LoadingState className="py-24" />;
  if (error || !invoice)
    return (
      <div className="p-8">
        <ErrorState error={error ?? new Error("Invoice not found")} onRetry={() => refetch()} />
      </div>
    );

  const isSent = invoice.status === "SENT";

  const onSend = async () => {
    try {
      const res = await sendMut.mutateAsync();
      toast.success(`Invoice ${res.invoice_number} emailed successfully`);
      setShowSend(false);
    } catch (err) {
      const msg = getFriendlyError(err);
      setSendAlert(msg);
      toast.error(msg);
    }
  };

  const openSend = () => {
    setSendAlert(invoice.customer_email ? null : "Customer email is required before sending invoices.");
    setShowSend(true);
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 p-6 lg:p-8">
      {/* Breadcrumb + actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Link to="/invoices" className="hover:text-primary">
            Invoices
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-on-surface">{invoice.invoice_number}</span>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => downloadInvoiceFile(invoice.id, invoice.invoice_number)}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          {!isSent && (
            <Button size="sm" onClick={openSend}>
              <Send className="h-4 w-4" />
              Send Email
            </Button>
          )}
        </div>
      </div>

      {/* Document card */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <div className="flex flex-col justify-between gap-6 border-b border-outline-variant p-6 md:flex-row md:items-start md:p-8">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-display-lg text-on-surface">{invoice.invoice_number}</h2>
              <StatusBadge meta={INVOICE_STATUS_META[invoice.status]} />
            </div>
            <p className="text-title-sm text-on-surface-variant">{invoice.customer_name}</p>
            {invoice.customer_email && (
              <p className="mt-1 flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                <Mail className="h-4 w-4" />
                {invoice.customer_email}
              </p>
            )}
            <Link to={`/sales/${invoice.sales_order_id}`} className="mt-1 inline-block text-body-sm text-primary hover:underline">
              from SO-{invoice.sales_order_id}
            </Link>
          </div>
          <div className="flex flex-col gap-2 md:text-right">
            <Row label="Generated" value={formatDateTime(invoice.generated_at)} />
            <Row label="Emailed" value={invoice.sent_at ? formatDateTime(invoice.sent_at) : "—"} />
            <div className="flex justify-between gap-8 md:justify-end">
              <span className="text-body-sm text-on-surface-variant">Total:</span>
              <span className="text-title-sm font-bold text-primary">{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest">
                <th className="px-6 py-3 text-label-upper uppercase text-on-surface-variant">Product</th>
                <th className="px-6 py-3 text-right text-label-upper uppercase text-on-surface-variant">Qty Delivered</th>
                <th className="px-6 py-3 text-right text-label-upper uppercase text-on-surface-variant">Unit Price</th>
                <th className="px-6 py-3 text-right text-label-upper uppercase text-on-surface-variant">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-table-data text-on-surface">
              {invoice.lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-6 py-4 font-semibold text-on-surface">{l.product_name}</td>
                  <td className="px-6 py-4 text-right">{formatNumber(l.quantity)}</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(l.unit_price)}</td>
                  <td className="px-6 py-4 text-right font-semibold">{formatCurrency(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-outline-variant bg-surface-container-lowest">
              <tr>
                <td className="px-6 py-4" colSpan={2} />
                <td className="px-6 py-3 text-right text-body-sm text-on-surface-variant">Grand Total:</td>
                <td className="px-6 py-3 text-right text-title-sm font-bold text-primary">
                  {formatCurrency(invoice.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Billing status guidance */}
      <SectionCard title="Billing Status">
        <p className="p-4 text-body-sm text-on-surface-variant">
          {isSent
            ? "Invoice has been emailed to the customer."
            : "Review and send this invoice to complete the customer billing process."}
        </p>
      </SectionCard>

      {/* Send email confirmation */}
      <Modal
        open={showSend}
        onClose={() => setShowSend(false)}
        title="Send Invoice Email"
        description={`Email ${invoice.invoice_number} with the PDF attached to the customer.`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowSend(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSend}
              disabled={sendMut.isPending || !invoice.customer_email}
            >
              {sendMut.isPending ? "Sending…" : "Send Email"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {sendAlert && <InlineAlert message={sendAlert} />}
          {invoice.customer_email ? (
            <p className="text-body-sm text-on-surface">
              The invoice will be sent to <span className="font-semibold">{invoice.customer_email}</span>.
            </p>
          ) : (
            <p className="text-body-sm text-on-surface-variant">
              No customer email is on file for this invoice.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-8 md:justify-end">
      <span className="text-body-sm text-on-surface-variant">{label}:</span>
      <span className="text-body-sm font-semibold text-on-surface">{value}</span>
    </div>
  );
}
