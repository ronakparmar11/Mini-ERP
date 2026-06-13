export type InvoiceStatus = "DRAFT" | "SENT";

export interface InvoiceLine {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

/** InvoiceOut from GET /invoices. */
export interface Invoice {
  id: number;
  invoice_number: string;
  sales_order_id: number;
  customer_name: string;
  customer_email: string | null;
  status: InvoiceStatus;
  total_amount: number;
  generated_at: string;
  sent_at: string | null;
  pdf_path: string | null;
  lines: InvoiceLine[];
}

/** GET /invoices returns a bare array (matching other list endpoints). */
export type InvoiceListResponse = Invoice[];
