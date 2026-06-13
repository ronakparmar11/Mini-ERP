import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelSalesOrder,
  confirmSalesOrder,
  createSalesOrder,
  deliverSalesOrder,
  getSalesOrder,
  importSalesOrderPdf,
  listSalesOrders,
} from "@/api/sales";
import type { DeliveryRequest, SalesOrderCreate, SalesOrderStatus } from "@/types/sales";

const SALES_KEY = "sales-orders";

/** AI-assisted PDF import (extraction only — no order is created). */
export const useImportSalesOrderPdf = () =>
  useMutation({ mutationFn: (file: File) => importSalesOrderPdf(file) });

export const useSalesOrders = (status?: SalesOrderStatus) =>
  useQuery({
    queryKey: [SALES_KEY, { status: status ?? "ALL" }],
    queryFn: () => listSalesOrders(status),
  });

export const useSalesOrder = (id: number) =>
  useQuery({
    queryKey: [SALES_KEY, id],
    queryFn: () => getSalesOrder(id),
    enabled: Number.isFinite(id),
  });

export const useCreateSalesOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SalesOrderCreate) => createSalesOrder(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SALES_KEY] }),
  });
};

/** Confirmation triggers reservation + procurement automation server-side. */
export const useConfirmSalesOrder = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => confirmSalesOrder(id),
    onSuccess: () => {
      // Reservation/procurement touch products, dashboards and the order itself.
      qc.invalidateQueries({ queryKey: [SALES_KEY] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useDeliverSalesOrder = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DeliveryRequest) => deliverSalesOrder(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useCancelSalesOrder = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelSalesOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
