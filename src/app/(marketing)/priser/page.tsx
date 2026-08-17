import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/design-system";
import { getProducts } from "@/lib/products/catalog";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Priser",
  description: "Enkel sjekk er alltid gratis. Du betaler først når du går videre.",
};

const descriptions: Record<string, string> = {
  "full-sjekk": "Full dokumentanalyse: fakta, tidslinje, regelverk og en strukturert rapport som PDF.",
  skatteendring: "KI-en bygger et ferdig grunnlag for henvendelsen til Skatteetaten, klart til gjennomsyn.",
  "komplett-sak": "AI setter sammen hele saksmappen: kronologi, bevis, dokumentkoblinger og dokumentasjonshull på tvers av alle dokumenter.",
  "strategisk-utredning": "Den mest avanserte analysen systemet kan produsere -- på tvers av dokumenter, år og regelverk, med flere strategiske vinkler.",
};

export default async function PriserPage() {
  const supabase = await createClient();
  const products = await getProducts(supabase);

  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="text-3xl font-semibold text-ink">Priser</h1>
      <p className="mt-4 max-w-xl text-[15.5px] text-ink-soft">
        Du starter alltid gratis. Hvert nivå du kjøper gir en dypere KI-analyse
        av saken din -- ikke bare flere funksjoner. Oppgraderer du senere,
        betaler du kun mellomlegget.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-primary bg-primary-subtle p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-ink">Enkel sjekk</h2>
            <Badge tone="info">Gratis</Badge>
          </div>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
            Rask KI-vurdering av saken din, uten dokumentopplasting.
          </p>
        </div>

        {products.map((product) => (
          <div
            key={product.product_code}
            className="rounded-lg border border-border bg-surface p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-ink">{product.name}</h2>
              <span className="text-[13px] font-medium text-ink-faint">
                {product.price_kr.toLocaleString("no-NO")} kr
              </span>
            </div>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
              {descriptions[product.product_code] ?? ""}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/logg-inn"
          className="inline-flex rounded-md bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-ink"
        >
          Start enkel sjekk — gratis
        </Link>
      </div>
    </main>
  );
}
