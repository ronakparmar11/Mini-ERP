import type { AuditLog, AuditModule } from "@/types/audit";

import { api } from "./axios";

export interface AuditQuery {
  module?: AuditModule;
  record_id?: number;
  limit?: number;
}

export const listAuditLogs = (params?: AuditQuery): Promise<AuditLog[]> =>
  api.get<AuditLog[]>("/audit-logs", { params }).then((r) => r.data);
