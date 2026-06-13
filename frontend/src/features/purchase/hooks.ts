import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelPurchaseOrder,
  confirmPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
} from "@/api/purchase";
import type { PurchaseOrderCreate, PurchaseOrderStatus, ReceiptRequest } from "@/types/purchase";

const PO_KEY = "purchase-orders";

export const usePurchaseOrders = (status?: PurchaseOrderStatus) =>
  useQuery({ queryKey: [PO_KEY, { status: status ?? "ALL" }], queryFn: () => listPurchaseOrders(status) });

export const usePurchaseOrder = (id: number) =>
  useQuery({ queryKey: [PO_KEY, id], queryFn: () => getPurchaseOrder(id), enabled: Number.isFinite(id) });

export const useCreatePurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PurchaseOrderCreate) => createPurchaseOrder(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PO_KEY] }),
  });
};

export const useConfirmPurchaseOrder = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => confirmPurchaseOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PO_KEY] }),
  });
};

/** Receiving raises on-hand stock → refresh products, inventory and dashboard. */
export const useReceivePurchaseOrder = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReceiptRequest) => receivePurchaseOrder(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PO_KEY] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useCancelPurchaseOrder = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelPurchaseOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PO_KEY] }),
  });
};
