import { Factory, HeartPulse, Package, ReceiptText, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { ActionCenter } from "@/features/dashboard/ActionCenter";
import { InventoryValueChart } from "@/features/dashboard/InventoryValueChart";
import { LowStockPanel } from "@/features/dashboard/LowStockPanel";
import { ManufacturingChart } from "@/features/dashboard/ManufacturingChart";
import { RecentActivityPanel } from "@/features/dashboard/RecentActivityPanel";
import {
  useInventorySummary,
  useLowStock,
  usePendingManufacturing,
  usePendingPurchases,
  usePendingSales,
} from "@/features/dashboard/hooks";
import { formatCurrency, formatNumber } from "@/utils/format";

export function DashboardPage() {
  const navigate = useNavigate();

  const inventory = useInventorySummary();
  const pendingSales = usePendingSales();
  const pendingPurchases = usePendingPurchases();
  const pendingMfg = usePendingManufacturing();
  const lowStock = useLowStock();

  const totalProducts = inventory.data?.total_products ?? 0;
  const lowCount = lowStock.data?.length ?? 0;
  const healthRatio = totalProducts > 0 ? (totalProducts - lowCount) / totalProducts : 1;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Executive Overview"
        subtitle="Today's operational snapshot."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate("/sales")}>
              <ReceiptText className="h-4 w-4" />
              New Sales Order
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate("/manufacturing")}>
              <Factory className="h-4 w-4" />
              Manufacturing
            </Button>
            <Button size="sm" onClick={() => navigate("/inventory")}>
              <Package className="h-4 w-4" />
              Inventory
            </Button>
          </>
        }
      />

      {/* Action Center — priorities first */}
      <section className="space-y-3">
        <h2 className="text-label-upper uppercase text-on-surface-variant">Action Center</h2>
        <ActionCenter />
      </section>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total Products"
          icon={Package}
          value={formatNumber(totalProducts)}
          isLoading={inventory.isLoading}
          footer={
            <p className="text-[11px] text-on-surface-variant">
              {formatNumber(inventory.data?.total_free_to_use ?? 0)} free to use
            </p>
          }
        />
        <KpiCard
          label="Pending Sales"
          icon={ReceiptText}
          accent="error"
          value={formatNumber(pendingSales.data?.length ?? 0)}
          isLoading={pendingSales.isLoading}
          footer={<p className="text-[11px] text-on-surface-variant">Awaiting fulfillment</p>}
        />
        <KpiCard
          label="Pending POs"
          icon={ShoppingCart}
          accent="secondary"
          value={formatNumber(pendingPurchases.data?.length ?? 0)}
          isLoading={pendingPurchases.isLoading}
          footer={<p className="text-[11px] text-on-surface-variant">Awaiting receipt</p>}
        />
        <KpiCard
          label="Active MOs"
          icon={Factory}
          accent="primary"
          value={formatNumber(pendingMfg.data?.length ?? 0)}
          isLoading={pendingMfg.isLoading}
          footer={<p className="text-[11px] text-on-surface-variant">In the pipeline</p>}
        />
        <KpiCard
          label="Inventory Health"
          icon={HeartPulse}
          accent="tertiary"
          value={`${Math.round(healthRatio * 100)}%`}
          isLoading={inventory.isLoading || lowStock.isLoading}
          footer={
            <div className="h-1.5 w-full rounded-full bg-surface-container-highest">
              <div
                className="h-1.5 rounded-full bg-tertiary-container"
                style={{ width: `${Math.round(healthRatio * 100)}%` }}
              />
            </div>
          }
        />
      </div>

      {/* Charts + low stock */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ManufacturingChart />
        <LowStockPanel />
      </div>

      {/* Stock value + recent activity */}
      <div className="grid grid-cols-1 gap-6 pb-4 lg:grid-cols-2">
        <InventoryValueChart />
        <RecentActivityPanel />
      </div>

      {inventory.data && (
        <p className="text-center text-[11px] text-on-surface-variant">
          Total stock value at cost: {formatCurrency(inventory.data.total_stock_value_at_cost)} •
          {" "}
          {formatNumber(inventory.data.total_on_hand)} units on hand •{" "}
          {formatNumber(inventory.data.total_reserved)} reserved
        </p>
      )}
    </div>
  );
}
