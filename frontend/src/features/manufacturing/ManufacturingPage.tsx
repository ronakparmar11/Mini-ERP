import { Plus } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CreateMODrawer } from "@/features/manufacturing/CreateMODrawer";
import { KanbanBoard } from "@/features/manufacturing/KanbanBoard";

export function ManufacturingPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Manufacturing Orders"
        subtitle="Manage production flow and work center capacity."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create MO
          </Button>
        }
      />

      <KanbanBoard />

      <CreateMODrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
