import { useQuery } from "@tanstack/react-query";

import {
  getExecutiveSummary,
  getInventorySummary,
  getLowStock,
  getManufacturingStats,
  getPendingManufacturing,
  getPendingPurchases,
  getPendingSales,
} from "@/api/dashboard";
import { listMovements } from "@/api/inventory";
import { listProducts } from "@/api/products";

export const useExecutiveSummary = () =>
  useQuery({ queryKey: ["dashboard", "executive-summary"], queryFn: getExecutiveSummary });

export const useInventorySummary = () =>
  useQuery({ queryKey: ["dashboard", "inventory-summary"], queryFn: getInventorySummary });

export const useLowStock = () =>
  useQuery({ queryKey: ["dashboard", "low-stock"], queryFn: () => getLowStock() });

export const usePendingSales = () =>
  useQuery({ queryKey: ["dashboard", "pending-sales"], queryFn: getPendingSales });

export const usePendingPurchases = () =>
  useQuery({ queryKey: ["dashboard", "pending-purchases"], queryFn: getPendingPurchases });

export const usePendingManufacturing = () =>
  useQuery({ queryKey: ["dashboard", "pending-manufacturing"], queryFn: getPendingManufacturing });

export const useManufacturingStats = () =>
  useQuery({ queryKey: ["dashboard", "manufacturing-stats"], queryFn: getManufacturingStats });

/** Recent inventory movements power the "Recent Activity" traceability feed. */
export const useRecentMovements = (limit = 8) =>
  useQuery({ queryKey: ["dashboard", "movements", limit], queryFn: () => listMovements({ limit }) });

/** Product catalogue, reused on the dashboard for value chart + movement labels. */
export const useDashboardProducts = () =>
  useQuery({ queryKey: ["products", { search: "" }], queryFn: () => listProducts() });
