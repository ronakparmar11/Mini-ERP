import type { InventoryMovement } from "@/types/inventory";

import { api } from "./axios";

export interface MovementQuery {
  product_id?: number;
  limit?: number;
}

export const listMovements = (params?: MovementQuery): Promise<InventoryMovement[]> =>
  api.get<InventoryMovement[]>("/inventory/movements", { params }).then((r) => r.data);
