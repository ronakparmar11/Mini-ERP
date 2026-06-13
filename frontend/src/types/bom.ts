export interface BoMComponent {
  id: number;
  component_product_id: number;
  quantity_required: number;
}

export interface BoMOperation {
  id: number;
  work_center: string;
  expected_duration: number;
}

/** BoMOut from GET /boms. */
export interface BoM {
  id: number;
  finished_product_id: number;
  quantity: number;
  created_at: string;
  components: BoMComponent[];
  operations: BoMOperation[];
}

export interface BoMComponentCreate {
  component_product_id: number;
  quantity_required: number;
}

export interface BoMOperationCreate {
  work_center: string;
  expected_duration: number;
}

export interface BoMCreate {
  finished_product_id: number;
  quantity: number;
  components: BoMComponentCreate[];
  operations: BoMOperationCreate[];
}
