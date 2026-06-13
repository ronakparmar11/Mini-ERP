export type MovementType =
  | "SALE_RESERVATION"
  | "SALE_DELIVERY"
  | "PURCHASE_RECEIPT"
  | "MO_CONSUMPTION"
  | "MO_PRODUCTION";

export type ReferenceType = "SALES_ORDER" | "PURCHASE_ORDER" | "MANUFACTURING_ORDER";

/** InventoryMovementOut from GET /inventory/movements. */
export interface InventoryMovement {
  id: number;
  product_id: number;
  quantity: number;
  movement_type: MovementType;
  reference_type: ReferenceType;
  reference_id: number;
  user_id: number | null;
  timestamp: string;
}
