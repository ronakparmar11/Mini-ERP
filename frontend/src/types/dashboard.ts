export interface LowStockProduct {
  product_id: number;
  name: string;
  on_hand_qty: number;
  reserved_qty: number;
  free_to_use_qty: number;
}

/** Shared shape for pending sales / purchases / manufacturing summaries. */
export interface PendingOrderSummary {
  id: number;
  reference: string;
  status: string;
  total_amount: number | null;
}

export interface ManufacturingStats {
  total: number;
  draft: number;
  confirmed: number;
  in_progress: number;
  done: number;
  cancelled: number;
  completion_rate: number;
}

export interface InventorySummary {
  total_products: number;
  total_on_hand: number;
  total_reserved: number;
  total_free_to_use: number;
  total_stock_value_at_cost: number;
}
