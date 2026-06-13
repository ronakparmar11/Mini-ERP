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

export interface TopProduct {
  product_id: number;
  name: string;
  units_sold: number;
  revenue: number;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
}

/** ExecutiveSummary from GET /dashboard/executive-summary. */
export interface ExecutiveSummary {
  revenue_this_month: number;
  revenue_change_pct: number | null;
  sales_orders_total: number;
  sales_orders_awaiting: number;
  fulfillment_rate: number;
  inventory_health: number;
  products_attention: number;
  active_manufacturing: number;
  manufacturing_delayed: number;
  outstanding_invoices: number;
  outstanding_invoices_value: number;
  top_products: TopProduct[];
  revenue_trend: RevenuePoint[];
}
