export type ProcurementMethod = "PURCHASE" | "MANUFACTURE";

/** ProductOut from GET /products. */
export interface Product {
  id: number;
  name: string;
  sales_price: number;
  cost_price: number;
  on_hand_qty: number;
  reserved_qty: number;
  free_to_use_qty: number;
  procure_on_demand: boolean;
  procurement_method: ProcurementMethod;
  vendor_id: number | null;
  created_at: string;
}

/** Body for POST /products (on_hand_qty is the opening balance). */
export interface ProductCreate {
  name: string;
  sales_price: number;
  cost_price: number;
  on_hand_qty: number;
  procure_on_demand: boolean;
  procurement_method: ProcurementMethod;
  vendor_id?: number | null;
}

/** Body for PATCH /products/{id} — stock quantities are intentionally excluded. */
export interface ProductUpdate {
  name?: string;
  sales_price?: number;
  cost_price?: number;
  procure_on_demand?: boolean;
  procurement_method?: ProcurementMethod;
  vendor_id?: number | null;
}
