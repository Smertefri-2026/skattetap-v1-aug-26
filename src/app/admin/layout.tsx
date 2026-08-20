import Link from "next/link";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const NAV_ITEMS = [
  { href: "/admin", label: "Oversikt" },
  { href: "/admin/saker", label: "Saker" },
  { href: "/admin/brukere", label: "Brukere" },
  { href: "/admin/support", label: "Support" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="text-[14px] font-semibold text-ink">Skattetap admin</span>
            <nav className="flex items-center gap-5">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[13px] font-medium text-ink-soft hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/min-side" className="text-[12.5px] text-ink-faint hover:text-ink-soft">
            ← Tilbake til Min side
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
