import { useQuery } from "@tanstack/react-query";

import { listMovements } from "@/api/inventory";

export const useMovements = (limit = 500) =>
  useQuery({ queryKey: ["inventory", "movements", limit], queryFn: () => listMovements({ limit }) });
