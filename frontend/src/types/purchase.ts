export type PurchaseOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface PurchaseOrderLine {
  id: number;
  product_id: number;
  ordered_quantity: number;
  received_quantity: number;
  cost_price: number;
  total: number;
  remaining_to_receive: number;
}

export interface PurchaseOrder {
  id: number;
  vendor: string;
  responsible_person: string | null;
  creation_date: string;
  status: PurchaseOrderStatus;
  source_sales_order_id: number | null;
  total_amount: number;
  lines: PurchaseOrderLine[];
}

export interface PurchaseOrderLineCreate {
  product_id: number;
  ordered_quantity: number;
  cost_price?: number | null;
}

export interface PurchaseOrderCreate {
  vendor: string;
  responsible_person?: string | null;
  lines: PurchaseOrderLineCreate[];
}

export interface ReceiptLineInput {
  line_id: number;
  quantity: number;
}

/** Body for POST /purchase-orders/{id}/receive. Omit `lines` to receive all. */
export interface ReceiptRequest {
  lines?: ReceiptLineInput[];
}
