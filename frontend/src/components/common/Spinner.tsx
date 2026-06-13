import { Loader2 } from "lucide-react";

import { cn } from "@/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-primary", className)} />;
}

/** Full-viewport centered loader for route-level suspense / auth bootstrap. */
export function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
