export interface ImportDuplicate {
  row: number;
  product_name: string;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export type ImportRowStatus = "valid" | "created" | "duplicate" | "error";

export interface ImportRow {
  row: number;
  product_name: string;
  status: ImportRowStatus;
  reason: string | null;
}

/** ImportResult from POST /products/import. */
export interface ImportResult {
  success_count: number;
  failure_count: number;
  duplicate_count: number;
  duplicates: ImportDuplicate[];
  errors: ImportError[];
  rows: ImportRow[];
  committed: boolean;
}
