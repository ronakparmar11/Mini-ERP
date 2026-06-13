import { useQuery } from "@tanstack/react-query";

import { listAuditLogs } from "@/api/audit";
import type { AuditModule } from "@/types/audit";

export const useAuditLogs = (module?: AuditModule, limit = 300) =>
  useQuery({
    queryKey: ["audit-logs", { module: module ?? "ALL", limit }],
    queryFn: () => listAuditLogs({ module, limit }),
  });
