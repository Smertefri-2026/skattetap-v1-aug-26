import Link from "next/link";
import { cn } from "@/lib/cn";

const tabs = [
  { key: "saker", label: "Saker" },
  { key: "dokumentasjon", label: "Dokumentasjon" },
  { key: "rapporter", label: "Rapporter" },
  { key: "kjop", label: "Kjøp" },
  { key: "profil", label: "Min konto" },
] as const;

export function MinSideTabs({ active }: { active: string }) {
  return (
    <nav className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/min-side?tab=${tab.key}`}
          className={cn(
            "border-b-2 px-4 py-3 text-[13.5px] font-semibold",
            active === tab.key
              ? "border-primary text-ink"
              : "border-transparent text-ink-soft hover:text-ink"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
