"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const tabs = [
  { key: "saker", label: "Saker" },
  { key: "dokumentasjon", label: "Dokumentasjon" },
  { key: "rapporter", label: "Rapporter" },
  { key: "kjop", label: "Kjøp" },
  { key: "profil", label: "Min konto" },
  { key: "papirkurv", label: "Papirkurv" },
] as const;

export function MinSideTabs({ active }: { active: string }) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // The tab bar scrolls horizontally on narrow screens and starts
    // scrolled to the left -- without this, landing straight on a tab
    // further right (e.g. Papirkurv after a delete) leaves the active
    // tab off-screen with no visible indication it's selected.
    activeRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [active]);

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          ref={active === tab.key ? activeRef : undefined}
          href={`/min-side?tab=${tab.key}`}
          className={cn(
            "shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-[13.5px] font-semibold",
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
