import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-ink",
  secondary:
    "bg-surface text-ink border border-border-strong hover:bg-surface-alt",
  ghost: "bg-transparent text-primary-ink hover:bg-primary-subtle",
  danger:
    "bg-surface text-danger-ink border border-danger hover:bg-danger-subtle",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-[18px] py-[10px] text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
