import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { AuditLogsPage } from "@/features/audit/AuditLogsPage";
import { BomPage } from "@/features/bom/BomPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { InvoiceDetailPage } from "@/features/invoices/InvoiceDetailPage";
import { InvoiceListPage } from "@/features/invoices/InvoiceListPage";
import { ManufacturingDetailPage } from "@/features/manufacturing/ManufacturingDetailPage";
import { ManufacturingPage } from "@/features/manufacturing/ManufacturingPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { PurchaseOrderDetailPage } from "@/features/purchase/PurchaseOrderDetailPage";
import { PurchaseOrdersPage } from "@/features/purchase/PurchaseOrdersPage";
import { SalesOrderDetailPage } from "@/features/sales/SalesOrderDetailPage";
import { SalesOrdersPage } from "@/features/sales/SalesOrdersPage";
import { LoginPage } from "@/pages/LoginPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SupportPage } from "@/pages/SupportPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/sales" element={<SalesOrdersPage />} />
          <Route path="/sales/:id" element={<SalesOrderDetailPage />} />
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
          <Route path="/bom" element={<BomPage />} />
          <Route path="/manufacturing" element={<ManufacturingPage />} />
          <Route path="/manufacturing/:id" element={<ManufacturingDetailPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/support" element={<SupportPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
