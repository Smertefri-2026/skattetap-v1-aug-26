import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

/**
 * Tone maps 1:1 to Evidence Engine source_type — the same color means the
 * same thing everywhere in the product, never re-mapped per context.
 */
export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-neutral-subtle text-neutral-ink border-neutral-border",
  success: "bg-success-subtle text-success-ink border-transparent",
  warning: "bg-warning-subtle text-warning-ink border-transparent",
  danger: "bg-danger-subtle text-danger-ink border-transparent",
  info: "bg-primary-subtle text-primary-ink border-transparent",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
