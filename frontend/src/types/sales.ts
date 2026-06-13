export type SalesOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_DELIVERED"
  | "DELIVERED"
  | "CANCELLED";

export interface SalesOrderLine {
  id: number;
  product_id: number;
  ordered_quantity: number;
  delivered_quantity: number;
  reserved_quantity: number;
  sales_price: number;
  total: number;
  remaining_to_deliver: number;
}

/** SalesOrderOut from GET /sales-orders. */
export interface SalesOrder {
  id: number;
  customer_name: string;
  customer_email: string | null;
  customer_address: string | null;
  salesperson: string | null;
  creation_date: string;
  status: SalesOrderStatus;
  total_amount: number;
  lines: SalesOrderLine[];
}

export interface SalesOrderLineCreate {
  product_id: number;
  ordered_quantity: number;
  sales_price?: number | null;
}

export interface SalesOrderCreate {
  customer_name: string;
  customer_email?: string | null;
  customer_address?: string | null;
  salesperson?: string | null;
  lines: SalesOrderLineCreate[];
}

export interface DeliveryLineInput {
  line_id: number;
  quantity: number;
}

/** Body for POST /sales-orders/{id}/deliver. Omit `lines` to deliver all remaining. */
export interface DeliveryRequest {
  lines?: DeliveryLineInput[];
}

/** One AI-extracted order line (for the review screen). */
export interface ImportedItem {
  product_name: string;
  quantity: number;
  matched_product_id: number | null;
  matched_product_name: string | null;
}

/** Response of POST /sales-orders/import-pdf (extraction only — nothing created). */
export interface ImportedOrder {
  customer_name: string | null;
  email: string | null;
  address: string | null;
  items: ImportedItem[];
}

/** Response of POST /sales-orders/{id}/confirm. */
export interface ConfirmationResult {
  sales_order: SalesOrder;
  generated_purchase_order_ids: number[];
  generated_manufacturing_order_ids: number[];
  messages: string[];
}
