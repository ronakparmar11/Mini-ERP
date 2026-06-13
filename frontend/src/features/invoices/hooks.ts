import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { generateInvoice, getInvoice, getInvoices, sendInvoice } from "@/api/invoice";
import type { InvoiceStatus } from "@/types/invoice";

const INVOICE_KEY = "invoices";

export const useInvoices = (status?: InvoiceStatus) =>
  useQuery({
    queryKey: [INVOICE_KEY, { status: status ?? "ALL" }],
    queryFn: () => getInvoices(status),
  });

export const useInvoice = (id: number) =>
  useQuery({
    queryKey: [INVOICE_KEY, id],
    queryFn: () => getInvoice(id),
    enabled: Number.isFinite(id),
  });

/** Generating an invoice touches invoices, the source SO and dashboard queues. */
export const useGenerateInvoice = (salesOrderId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => generateInvoice(salesOrderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVOICE_KEY] });
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useSendInvoice = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sendInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVOICE_KEY] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};
