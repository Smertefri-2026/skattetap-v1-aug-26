import Link from "next/link";
import { Wordmark } from "@/components/marketing/Wordmark";

const columns = [
  {
    title: "Produkt",
    links: [
      { href: "/slik-fungerer-det", label: "Slik fungerer det" },
      { href: "/eksempel", label: "Eksempel" },
      { href: "/priser", label: "Priser" },
    ],
  },
  {
    title: "Selskap",
    links: [
      { href: "/om", label: "Om Skattetap" },
      { href: "/kontakt", label: "Kontakt" },
    ],
  },
  {
    title: "Juridisk",
    links: [
      { href: "/vilkar", label: "Vilkår" },
      { href: "/personvern", label: "Personvern" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-14 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <p>
            <Wordmark tone="on-dark" className="text-[15px]" />
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">
            Skattetap gir deg en strukturert vurdering av saken din basert på
            dine egne dokumenter. Vi gir ingen juridisk fasit og garanterer
            ikke noe resultat.
          </p>
        </div>

        <div className="flex gap-14">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                {col.title}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-white/70 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-5 text-[12px] text-white/40">
          © {new Date().getFullYear()} Skattetap.no
        </div>
      </div>
    </footer>
  );
}
