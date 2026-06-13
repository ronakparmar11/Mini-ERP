import { AlertTriangle, Info, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tone = "warning" | "error" | "info";

const toneStyles: Record<Tone, { box: string; icon: LucideIcon; iconColor: string }> = {
  warning: { box: "border-[#fcd34d] bg-[#fffbeb] text-[#92400e]", icon: AlertTriangle, iconColor: "text-[#b45309]" },
  error: { box: "border-error-container bg-error-container/30 text-on-error-container", icon: XCircle, iconColor: "text-error" },
  info: { box: "border-secondary-fixed-dim bg-secondary-container text-on-secondary-container", icon: Info, iconColor: "text-primary" },
};

/**
 * Inline, dialog-friendly alert. Used to surface humanized business errors next
 * to the action that triggered them (so the guidance stays visible after a toast
 * has disappeared).
 */
export function InlineAlert({
  message,
  tone = "warning",
  className,
}: {
  message: string;
  tone?: Tone;
  className?: string;
}) {
  const { box, icon: Icon, iconColor } = toneStyles[tone];
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-body-sm ${box} ${className ?? ""}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
      <span>{message}</span>
    </div>
  );
}
