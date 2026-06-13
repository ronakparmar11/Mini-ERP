import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

interface SectionCardProps {
  title: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
}

/** White panel with a titled header — reused across dashboard + module pages. */
export function SectionCard({
  title,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
  headerClassName,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border border-outline-variant bg-surface shadow-sm",
        className,
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 border-b border-outline-variant p-4",
          headerClassName,
        )}
      >
        <h2 className="flex items-center gap-2 text-title-sm text-on-background">
          {Icon && <Icon className="h-5 w-5 text-outline" />}
          {title}
        </h2>
        {actions}
      </header>
      <div className={cn("flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
