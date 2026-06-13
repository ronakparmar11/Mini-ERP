import type {
  InventorySummary,
  LowStockProduct,
  ManufacturingStats,
  PendingOrderSummary,
} from "@/types/dashboard";

import { api } from "./axios";

export const getInventorySummary = (): Promise<InventorySummary> =>
  api.get<InventorySummary>("/dashboard/inventory-summary").then((r) => r.data);

export const getLowStock = (threshold?: number): Promise<LowStockProduct[]> =>
  api
    .get<LowStockProduct[]>("/dashboard/low-stock", {
      params: threshold != null ? { threshold } : undefined,
    })
    .then((r) => r.data);

export const getPendingSales = (): Promise<PendingOrderSummary[]> =>
  api.get<PendingOrderSummary[]>("/dashboard/pending-sales").then((r) => r.data);

export const getPendingPurchases = (): Promise<PendingOrderSummary[]> =>
  api.get<PendingOrderSummary[]>("/dashboard/pending-purchases").then((r) => r.data);

export const getPendingManufacturing = (): Promise<PendingOrderSummary[]> =>
  api.get<PendingOrderSummary[]>("/dashboard/pending-manufacturing").then((r) => r.data);

export const getManufacturingStats = (): Promise<ManufacturingStats> =>
  api.get<ManufacturingStats>("/dashboard/manufacturing-stats").then((r) => r.data);
