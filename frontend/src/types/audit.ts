export type AuditModule =
  | "PRODUCT"
  | "SALES_ORDER"
  | "PURCHASE_ORDER"
  | "MANUFACTURING_ORDER"
  | "BOM"
  | "INVOICE";

/** AuditLogOut from GET /audit-logs. */
export interface AuditLog {
  id: number;
  module: AuditModule;
  record_type: string;
  record_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  user_id: number | null;
  timestamp: string;
}
