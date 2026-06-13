import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/utils/cn";

/** Pill badge with semantic tones — reused for statuses and procurement routes. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-outline-variant bg-surface-container text-on-surface-variant",
        primary: "border-primary-fixed-dim bg-primary-fixed/40 text-primary",
        success: "border-tertiary-fixed-dim bg-[#f0fdf4] text-tertiary-container",
        warning: "border-[#fcd34d] bg-[#fffbeb] text-[#b45309]",
        danger: "border-error-container bg-error-container/40 text-on-error-container",
        info: "border-secondary-fixed-dim bg-secondary-container text-on-secondary-container",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
