import type {
  PurchaseOrder,
  PurchaseOrderCreate,
  PurchaseOrderStatus,
  ReceiptRequest,
} from "@/types/purchase";

import { api } from "./axios";

export const listPurchaseOrders = (status?: PurchaseOrderStatus): Promise<PurchaseOrder[]> =>
  api
    .get<PurchaseOrder[]>("/purchase-orders", { params: status ? { status_filter: status } : undefined })
    .then((r) => r.data);

export const getPurchaseOrder = (id: number): Promise<PurchaseOrder> =>
  api.get<PurchaseOrder>(`/purchase-orders/${id}`).then((r) => r.data);

export const createPurchaseOrder = (body: PurchaseOrderCreate): Promise<PurchaseOrder> =>
  api.post<PurchaseOrder>("/purchase-orders", body).then((r) => r.data);

export const confirmPurchaseOrder = (id: number): Promise<PurchaseOrder> =>
  api.post<PurchaseOrder>(`/purchase-orders/${id}/confirm`).then((r) => r.data);

export const receivePurchaseOrder = (id: number, body: ReceiptRequest): Promise<PurchaseOrder> =>
  api.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, body).then((r) => r.data);

export const cancelPurchaseOrder = (id: number): Promise<PurchaseOrder> =>
  api.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`).then((r) => r.data);
