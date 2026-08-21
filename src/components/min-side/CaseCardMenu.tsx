"use client";

import { useEffect, useRef, useState } from "react";
import { archiveCase, restoreCase } from "@/lib/cases/actions";

function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4.5 w-4.5" aria-hidden="true">
      <path d="M4 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM13 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
    </svg>
  );
}

export function CaseCardMenu({ caseId, archived }: { caseId: string; archived: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function handleAction() {
    setPending(true);
    try {
      if (archived) {
        await restoreCase(caseId);
      } else {
        await archiveCase(caseId);
      }
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Flere valg"
        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-surface-alt hover:text-ink"
      >
        <MoreIcon />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-20 w-52 rounded-md border border-border bg-surface py-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={handleAction}
            className="block w-full px-3.5 py-2 text-left text-[13.5px] text-ink hover:bg-surface-alt disabled:opacity-50"
          >
            {archived ? "Gjenopprett sak" : "Flytt til papirkurv"}
          </button>
        </div>
      )}
    </div>
  );
}
