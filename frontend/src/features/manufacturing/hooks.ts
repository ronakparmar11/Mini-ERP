import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelManufacturingOrder,
  confirmManufacturingOrder,
  createManufacturingOrder,
  getManufacturingOrder,
  listManufacturingOrders,
  produceManufacturingOrder,
  startManufacturingOrder,
} from "@/api/manufacturing";
import type { ManufacturingOrderCreate, ProduceRequest } from "@/types/manufacturing";

const MO_KEY = "manufacturing-orders";

export const useManufacturingOrders = () =>
  useQuery({ queryKey: [MO_KEY], queryFn: () => listManufacturingOrders() });

export const useManufacturingOrder = (id: number) =>
  useQuery({
    queryKey: [MO_KEY, id],
    queryFn: () => getManufacturingOrder(id),
    enabled: Number.isFinite(id),
  });

/** Production touches stock + dashboards; other transitions touch the MO/list. */
const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: [MO_KEY] });
  qc.invalidateQueries({ queryKey: ["products"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
};

export const useCreateMO = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ManufacturingOrderCreate) => createManufacturingOrder(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [MO_KEY] }),
  });
};

export const useConfirmMO = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => confirmManufacturingOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [MO_KEY] }),
  });
};

export const useStartMO = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => startManufacturingOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [MO_KEY] }),
  });
};

export const useProduceMO = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProduceRequest) => produceManufacturingOrder(id, body),
    onSuccess: () => invalidateAll(qc),
  });
};

export const useCancelMO = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelManufacturingOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [MO_KEY] }),
  });
};
