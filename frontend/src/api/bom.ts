import type { BoM, BoMCreate } from "@/types/bom";

import { api } from "./axios";

export const listBoms = (finishedProductId?: number): Promise<BoM[]> =>
  api
    .get<BoM[]>("/boms", {
      params: finishedProductId != null ? { finished_product_id: finishedProductId } : undefined,
    })
    .then((r) => r.data);

export const getBom = (id: number): Promise<BoM> =>
  api.get<BoM>(`/boms/${id}`).then((r) => r.data);

export const createBom = (body: BoMCreate): Promise<BoM> =>
  api.post<BoM>("/boms", body).then((r) => r.data);

export const deleteBom = (id: number): Promise<void> =>
  api.delete(`/boms/${id}`).then(() => undefined);
