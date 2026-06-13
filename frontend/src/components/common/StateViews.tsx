import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { Spinner } from "@/components/common/Spinner";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/utils/apiError";
import { cn } from "@/utils/cn";

export function LoadingState({ className, label = "Loading…" }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12", className)}>
      <Spinner className="h-7 w-7" />
      <p className="text-body-sm text-on-surface-variant">{label}</p>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container/50">
        <AlertTriangle className="h-6 w-6 text-error" />
      </div>
      <div>
        <p className="text-body-md font-semibold text-on-surface">Failed to load</p>
        <p className="mt-1 max-w-sm text-body-sm text-on-surface-variant">
          {getApiErrorMessage(error)}
        </p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  message = "No records found",
  icon,
  className,
}: {
  message?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container">
        {icon ?? <Inbox className="h-6 w-6 text-outline" />}
      </div>
      <p className="text-body-sm text-on-surface-variant">{message}</p>
    </div>
  );
}
