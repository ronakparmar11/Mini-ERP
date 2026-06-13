import { FileText, Send } from "lucide-react";
import { toast } from "sonner";

import { downloadInvoice } from "@/api/invoice";
import type { StatusMeta } from "@/components/common/StatusBadge";
import type { InvoiceStatus } from "@/types/invoice";
import { getFriendlyError } from "@/utils/apiError";

export const INVOICE_STATUS_META: Record<InvoiceStatus, StatusMeta> = {
  DRAFT: { label: "Draft", tone: "warning", icon: FileText },
  SENT: { label: "Sent", tone: "success", icon: Send },
};

/** Fetch the PDF blob and trigger a browser download. Surfaces errors as toasts. */
export async function downloadInvoiceFile(id: number, invoiceNumber: string): Promise<void> {
  try {
    const blob = await downloadInvoice(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.error(getFriendlyError(err));
  }
}
