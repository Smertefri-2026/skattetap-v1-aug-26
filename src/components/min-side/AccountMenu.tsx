"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function AccountMenu({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
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

  const initial = email.trim().charAt(0).toUpperCase() || "?";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border-strong bg-surface py-1 pl-1 pr-3 hover:bg-surface-alt"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11.5px] font-semibold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[180px] truncate text-[13px] text-ink-soft sm:inline">{email}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 rounded-md border border-border bg-surface py-1.5 shadow-lg"
        >
          <p className="truncate px-3.5 py-1.5 text-[12px] text-ink-faint sm:hidden">{email}</p>
          <Link
            href="/min-side?tab=saker"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2 text-[13.5px] text-ink hover:bg-surface-alt"
          >
            Mine saker
          </Link>
          <Link
            href="/min-side?tab=profil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2 text-[13.5px] text-ink hover:bg-surface-alt"
          >
            Min konto
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3.5 py-2 text-[13.5px] text-ink hover:bg-surface-alt"
            >
              Admin
            </Link>
          )}
          <div className="my-1.5 border-t border-border" />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-3.5 py-2 text-left text-[13.5px] font-medium text-danger-ink hover:bg-danger-subtle"
            >
              Logg ut
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
