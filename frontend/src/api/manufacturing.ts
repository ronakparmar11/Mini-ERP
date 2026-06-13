import type {
  ManufacturingOrder,
  ManufacturingOrderCreate,
  ManufacturingOrderStatus,
  ProduceRequest,
} from "@/types/manufacturing";

import { api } from "./axios";

export const listManufacturingOrders = (
  status?: ManufacturingOrderStatus,
): Promise<ManufacturingOrder[]> =>
  api
    .get<ManufacturingOrder[]>("/manufacturing-orders", {
      params: status ? { status_filter: status } : undefined,
    })
    .then((r) => r.data);

export const getManufacturingOrder = (id: number): Promise<ManufacturingOrder> =>
  api.get<ManufacturingOrder>(`/manufacturing-orders/${id}`).then((r) => r.data);

export const createManufacturingOrder = (
  body: ManufacturingOrderCreate,
): Promise<ManufacturingOrder> =>
  api.post<ManufacturingOrder>("/manufacturing-orders", body).then((r) => r.data);

export const confirmManufacturingOrder = (id: number): Promise<ManufacturingOrder> =>
  api.post<ManufacturingOrder>(`/manufacturing-orders/${id}/confirm`).then((r) => r.data);

export const startManufacturingOrder = (id: number): Promise<ManufacturingOrder> =>
  api.post<ManufacturingOrder>(`/manufacturing-orders/${id}/start`).then((r) => r.data);

export const produceManufacturingOrder = (
  id: number,
  body: ProduceRequest,
): Promise<ManufacturingOrder> =>
  api.post<ManufacturingOrder>(`/manufacturing-orders/${id}/produce`, body).then((r) => r.data);

export const cancelManufacturingOrder = (id: number): Promise<ManufacturingOrder> =>
  api.post<ManufacturingOrder>(`/manufacturing-orders/${id}/cancel`).then((r) => r.data);
