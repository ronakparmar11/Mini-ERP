import { ReceiptText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { ActionCenter } from "@/features/dashboard/ActionCenter";
import { ExecutiveOverview } from "@/features/dashboard/ExecutiveOverview";
import { OperationalRisks } from "@/features/dashboard/OperationalRisks";
import { RecentActivityFeed } from "@/features/dashboard/RecentActivityFeed";
import { RevenueTrendCard } from "@/features/dashboard/RevenueTrendCard";
import { TopProductsCard } from "@/features/dashboard/TopProductsCard";

/**
 * Executive (operational intelligence) dashboard. Five sections, top to bottom:
 *   1. Executive Overview (KPI hero)
 *   2. Today's Priorities (Action Center)
 *   3. Revenue & Performance Insights
 *   4. Operational Risks
 *   5. Recent Business Activity
 */
export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-6 lg:p-8">
      <PageHeader
        title="Executive Dashboard"
        subtitle="How healthy is your business today?"
        actions={
          <Button size="sm" onClick={() => navigate("/sales", { state: { create: true } })}>
            <ReceiptText className="h-4 w-4" />
            New Sales Order
          </Button>
        }
      />

      {/* 1 — Executive Overview */}
      <ExecutiveOverview />

      {/* 2 — Today's Priorities (visually dominant) */}
      <section className="space-y-4 rounded-xl border border-outline-variant border-l-4 border-l-primary bg-surface-container-low p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <h2 className="text-title-sm font-bold text-on-surface">Today's Priorities</h2>
          <span className="text-body-sm text-on-surface-variant">— what needs attention now</span>
        </div>
        <ActionCenter />
      </section>

      {/* 3 — Revenue & Performance Insights */}
      <section className="space-y-4">
        <h2 className="text-label-upper uppercase text-on-surface-variant">Revenue &amp; Performance</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RevenueTrendCard />
          <TopProductsCard />
        </div>
      </section>

      {/* 4 — Operational Risks */}
      <section className="space-y-4">
        <h2 className="text-label-upper uppercase text-on-surface-variant">Operational Risks</h2>
        <OperationalRisks />
      </section>

      {/* 5 — Recent Business Activity */}
      <RecentActivityFeed />
    </div>
  );
}
