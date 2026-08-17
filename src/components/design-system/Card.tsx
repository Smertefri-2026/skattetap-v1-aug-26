import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
}

export function Card({ selected, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-5",
        selected
          ? "bg-primary-subtle border border-primary"
          : "bg-surface border border-border shadow-sm",
        className
      )}
      {...props}
    />
  );
}
