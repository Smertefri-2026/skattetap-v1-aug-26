import { cn } from "@/lib/cn";

export type WordmarkTone = "on-light" | "on-dark";

/**
 * Customer-facing brand wordmark only -- domain, routes, DB names, and
 * internal identifiers all stay "skattetap"/"Skattetap". Two-tone styling
 * (Skatte/Tap/.no) uses existing design tokens so it stays reusable in
 * header, footer, and any future page without inventing new colors.
 */
const toneClasses: Record<WordmarkTone, { skatte: string; tap: string; tld: string }> = {
  "on-light": {
    skatte: "text-ink",
    tap: "text-primary",
    tld: "text-ink-faint",
  },
  "on-dark": {
    skatte: "text-white",
    tap: "text-primary",
    tld: "text-white/40",
  },
};

export function Wordmark({
  tone = "on-light",
  className,
}: {
  tone?: WordmarkTone;
  className?: string;
}) {
  const c = toneClasses[tone];
  return (
    <span className={cn("font-semibold", className)}>
      <span className={c.skatte}>Skatte</span>
      <span className={c.tap}>Tap</span>
      <span className={c.tld}>.no</span>
    </span>
  );
}
