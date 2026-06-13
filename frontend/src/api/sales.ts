import type {
  ConfirmationResult,
  DeliveryRequest,
  SalesOrder,
  SalesOrderCreate,
  SalesOrderStatus,
} from "@/types/sales";

import { api } from "./axios";

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
