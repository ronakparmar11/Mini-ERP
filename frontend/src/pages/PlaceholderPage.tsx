import { Construction } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";

/**
 * Temporary scaffold for modules implemented in later phases. Renders the real
 * page chrome (header) with a clearly-labelled "coming up" state — never mock
 * data — so navigation and layout are verifiable in Phase 1.
 */
export function PlaceholderPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-low/40 py-20 text-center">
        <Construction className="h-10 w-10 text-outline" />
        <p className="text-body-md font-medium text-on-surface">{title} — coming in a later phase</p>
        <p className="max-w-md text-body-sm text-on-surface-variant">
          This module will be wired to live backend endpoints in an upcoming phase.
        </p>
      </div>
    </div>
  );
}
