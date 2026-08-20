import Link from "next/link";

const navItems = [
  { href: "/slik-fungerer-det", label: "Slik fungerer det" },
  { href: "/eksempel", label: "Eksempel" },
  { href: "/priser", label: "Priser" },
  { href: "/om", label: "Om" },
  { href: "/kontakt", label: "Kontakt" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-[15px] font-semibold text-white">
          Skattetap<span className="text-primary">.no</span>
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

        <div className="flex items-center gap-3">
          <Link
            href="/logg-inn"
            className="text-[13.5px] font-semibold text-white/80 hover:text-white"
          >
            Logg inn
          </Link>
          <Link
            href="/logg-inn?tab=registrer"
            className="rounded-md bg-primary px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-primary-ink"
          >
            Start enkel sjekk
          </Link>
        </div>
      </div>
    </header>
  );
}
