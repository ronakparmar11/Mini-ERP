import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { SalesOrderDetailPage } from "@/features/sales/SalesOrderDetailPage";
import { SalesOrdersPage } from "@/features/sales/SalesOrdersPage";
import { LoginPage } from "@/pages/LoginPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

/**
 * Route map. Real module pages replace the placeholders phase-by-phase:
 *   Phase 2 → dashboard, products   Phase 3 → sales
 *   Phase 4 → manufacturing/boms    Phase 5 → inventory, audit
 */
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
          <Route
            path="/purchase"
            element={
              <PlaceholderPage title="Purchase Orders" subtitle="Procurement and goods receipt." />
            }
          />
          <Route
            path="/boms"
            element={
              <PlaceholderPage title="Bills of Materials" subtitle="Define how products are built." />
            }
          />
          <Route
            path="/manufacturing"
            element={
              <PlaceholderPage
                title="Manufacturing Orders"
                subtitle="Manage production flow and work center capacity."
              />
            }
          />
          <Route
            path="/inventory"
            element={
              <PlaceholderPage
                title="Inventory"
                subtitle="Track serial numbers and lots across all supply chain nodes."
              />
            }
          />
          <Route
            path="/audit"
            element={
              <PlaceholderPage title="Audit Logs" subtitle="Review system activity and historical changes." />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
