import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createBom, deleteBom, listBoms } from "@/api/bom";
import type { BoMCreate } from "@/types/bom";

const BOM_KEY = "boms";

export const useBoms = () =>
  useQuery({ queryKey: [BOM_KEY], queryFn: () => listBoms() });

export const useCreateBom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BoMCreate) => createBom(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [BOM_KEY] }),
  });
};

export const useDeleteBom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBom(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [BOM_KEY] }),
  });
};
