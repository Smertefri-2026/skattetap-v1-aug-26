"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Wordmark } from "@/components/marketing/Wordmark";

const navItems = [
  { href: "/slik-fungerer-det", label: "Slik fungerer det" },
  { href: "/priser", label: "Priser" },
  { href: "/kontakt", label: "Kontakt" },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function MinSideHeader({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" onClick={() => setOpen(false)}>
          <Wordmark tone="on-dark" className="text-[15px]" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13.5px] font-medium text-white/70 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-4 md:flex">
            {isAdmin && (
              <Link href="/admin" className="text-[13.5px] font-medium text-white/70 hover:text-white">
                Admin
              </Link>
            )}
            <Link href="/min-side" className="text-[13.5px] font-semibold text-white hover:text-white/80">
              Min side
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-[13.5px] font-semibold text-white/70 hover:text-white">
                Logg ut
              </button>
            </form>
          </div>
          <button
            ref={toggleRef}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Lukk meny" : "Åpne meny"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <XIcon /> : <MenuIcon />}
          </button>
        </div>

        {open && (
          <div
            id={menuId}
            className="absolute inset-x-0 top-full border-t border-white/10 bg-ink px-6 py-4 md:hidden"
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2.5 text-[14.5px] font-medium text-white/80 hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/min-side"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2.5 text-[14.5px] font-semibold text-white hover:bg-white/5"
              >
                Min side
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2.5 text-[14.5px] font-medium text-white/80 hover:bg-white/5 hover:text-white"
                >
                  Admin
                </Link>
              )}
            </nav>
            <form action="/auth/signout" method="post" className="mt-3">
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-md border border-white/15 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-white/5"
              >
                Logg ut
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
