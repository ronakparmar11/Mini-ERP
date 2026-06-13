import type { Invoice, InvoiceListResponse, InvoiceStatus } from "@/types/invoice";

import { api } from "./axios";

export const getInvoices = (status?: InvoiceStatus): Promise<InvoiceListResponse> =>
  api
    .get<InvoiceListResponse>("/invoices", {
      params: status ? { status_filter: status } : undefined,
    })
    .then((r) => r.data);

export const getInvoice = (id: number): Promise<Invoice> =>
  api.get<Invoice>(`/invoices/${id}`).then((r) => r.data);

export const generateInvoice = (salesOrderId: number): Promise<Invoice> =>
  api.post<Invoice>(`/sales-orders/${salesOrderId}/generate-invoice`).then((r) => r.data);

export const sendInvoice = (id: number): Promise<Invoice> =>
  api.post<Invoice>(`/invoices/${id}/send-email`).then((r) => r.data);

/** Fetches the PDF as a Blob (auth header is applied by the axios interceptor). */
export const downloadInvoice = (id: number): Promise<Blob> =>
  api.get(`/invoices/${id}/download`, { responseType: "blob" }).then((r) => r.data);
