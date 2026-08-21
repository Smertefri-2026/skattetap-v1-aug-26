import Link from "next/link";
import { Wordmark } from "@/components/marketing/Wordmark";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const NAV_ITEMS = [
  { href: "/admin", label: "Oversikt" },
  { href: "/admin/saker", label: "Saker" },
  { href: "/admin/brukere", label: "Brukere" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/refusjoner", label: "Refusjoner" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/" className="shrink-0">
              <Wordmark tone="on-dark" className="text-[15px]" />
            </Link>
            <span className="hidden shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/60 sm:inline">
              Admin
            </span>
            <nav className="flex min-w-0 items-center gap-5 overflow-x-auto">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 whitespace-nowrap text-[13px] font-medium text-white/70 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/min-side" className="shrink-0 text-[12.5px] font-medium text-white/70 hover:text-white">
            ← Min side
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
