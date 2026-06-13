export type ManufacturingOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "DONE"
  | "CANCELLED";

export interface MOComponent {
  id: number;
  component_product_id: number;
  quantity_required: number;
  quantity_consumed: number;
}

export interface MOOperation {
  id: number;
  work_center: string;
  expected_duration: number;
  actual_duration: number | null;
}

/** ManufacturingOrderOut from GET /manufacturing-orders. */
export interface ManufacturingOrder {
  id: number;
  finished_product_id: number;
  bom_id: number | null;
  quantity_to_produce: number;
  assignee: string | null;
  schedule_date: string | null;
  creation_date: string;
  status: ManufacturingOrderStatus;
  source_sales_order_id: number | null;
  components: MOComponent[];
  operations: MOOperation[];
}

export interface ManufacturingOrderCreate {
  bom_id: number;
  quantity_to_produce: number;
  assignee?: string | null;
  schedule_date?: string | null;
}

export interface ProduceOperationActual {
  operation_id: number;
  actual_duration: number;
}

/** Body for POST /manufacturing-orders/{id}/produce. */
export interface ProduceRequest {
  operations?: ProduceOperationActual[];
}
