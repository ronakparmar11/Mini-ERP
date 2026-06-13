import type {
  ConfirmationResult,
  DeliveryRequest,
  ImportedOrder,
  SalesOrder,
  SalesOrderCreate,
  SalesOrderStatus,
} from "@/types/sales";

import { api } from "./axios";

/** AI-extract a customer order from a PDF (review only; creates nothing). */
export const importSalesOrderPdf = (file: File): Promise<ImportedOrder> => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post<ImportedOrder>("/sales-orders/import-pdf", form, {
      // Let the browser set multipart/form-data + boundary (drop the JSON default).
      headers: { "Content-Type": undefined as unknown as string },
    })
    .then((r) => r.data);
};

export const listSalesOrders = (status?: SalesOrderStatus): Promise<SalesOrder[]> =>
  api
    .get<SalesOrder[]>("/sales-orders", { params: status ? { status_filter: status } : undefined })
    .then((r) => r.data);

export const getSalesOrder = (id: number): Promise<SalesOrder> =>
  api.get<SalesOrder>(`/sales-orders/${id}`).then((r) => r.data);

export const createSalesOrder = (body: SalesOrderCreate): Promise<SalesOrder> =>
  api.post<SalesOrder>("/sales-orders", body).then((r) => r.data);

export const confirmSalesOrder = (id: number): Promise<ConfirmationResult> =>
  api.post<ConfirmationResult>(`/sales-orders/${id}/confirm`).then((r) => r.data);

export const deliverSalesOrder = (id: number, body: DeliveryRequest): Promise<SalesOrder> =>
  api.post<SalesOrder>(`/sales-orders/${id}/deliver`, body).then((r) => r.data);

export const cancelSalesOrder = (id: number): Promise<SalesOrder> =>
  api.post<SalesOrder>(`/sales-orders/${id}/cancel`).then((r) => r.data);
