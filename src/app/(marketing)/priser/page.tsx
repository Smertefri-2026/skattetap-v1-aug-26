import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/design-system";
import { UpgradeStaircase } from "@/components/marketing/UpgradeStaircase";
import type { CaseStage } from "@/lib/cases/types";
import { getProducts } from "@/lib/products/catalog";
import { getPurchaseHref, purchaseCtaLabel } from "@/lib/products/purchaseLinks";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Priser",
  description: "Enkel sjekk er alltid gratis. Du betaler først når du går videre.",
};

const descriptions: Record<string, string> = {
  "full-sjekk": "Full dokumentanalyse: fakta, tidslinje, regelverk og en strukturert rapport som PDF.",
  skatteendring: "KI-en bygger et ferdig grunnlag for henvendelsen til Skatteetaten, klart til gjennomsyn.",
  "komplett-sak":
    "KI-en setter sammen hele saksmappen: kronologi, bevis, dokumentkoblinger og dokumentasjonshull på tvers av alle dokumenter.",
  "strategisk-utredning":
    "Den mest avanserte analysen systemet kan produsere -- på tvers av dokumenter, år og regelverk, med flere strategiske vinkler.",
};

const trustAnswers = [
  {
    q: "Må jeg betale for å prøve?",
    a: "Nei. Enkel sjekk er alltid gratis, og du bestemmer selv om du vil gå videre.",
  },
  {
    q: "Hva om SkatteTap ikke finner noe?",
    a: "Da får du beskjed om det, tydelig og ærlig -- ikke et forsøk på å overbevise deg om noe som ikke er der.",
  },
  {
    q: "Hva skjer om jeg oppgraderer senere?",
    a: "Du betaler kun differansen mellom det du allerede har kjøpt og det nye nivået -- aldri full pris på nytt.",
  },
];

export default async function PriserPage() {
  const supabase = await createClient();
  const [{ data: userData }, products] = await Promise.all([supabase.auth.getUser(), getProducts(supabase)]);
  const isLoggedIn = userData.user != null;
  const priceByStage = Object.fromEntries(
    products.map((p) => [p.product_code, p.price_kr])
  ) as Partial<Record<CaseStage, number>>;

  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-semibold text-ink">Priser</h1>
      <p className="mt-4 max-w-xl text-[15.5px] text-ink-soft">
        Du starter alltid gratis. Hvert nivå du kjøper gir en dypere KI-analyse av saken din --
        ikke bare flere funksjoner. Oppgraderer du senere, betaler du kun mellomlegget.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col rounded-lg border border-primary bg-primary-subtle p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-ink">Enkel sjekk</h2>
            <Badge tone="info">Gratis</Badge>
          </div>
          <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-ink-soft">
            Rask KI-vurdering av saken din, uten dokumentopplasting.
          </p>
          <Link
            href={getPurchaseHref("enkel-sjekk", isLoggedIn)}
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-ink"
          >
            Start gratis
          </Link>
        </div>

        {products.map((product) => (
          <div key={product.product_code} className="flex flex-col rounded-lg border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-ink">{product.name}</h2>
            </div>
            <p className="mt-1 text-[13px] font-medium text-ink-faint">
              {product.price_kr.toLocaleString("no-NO")} kr
            </p>
            <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-ink-soft">
              {descriptions[product.product_code] ?? ""}
            </p>
            <Link
              href={getPurchaseHref(product.product_code as CaseStage, isLoggedIn)}
              className="mt-4 inline-flex items-center justify-center rounded-md border border-border-strong bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:bg-surface-alt"
            >
              {purchaseCtaLabel[product.product_code as CaseStage]}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-lg border border-border bg-surface-alt p-6">
        <p className="text-center text-[13px] font-medium text-ink-soft">Oppgradering underveis</p>
        <div className="mt-5">
          <UpgradeStaircase priceByStage={priceByStage} />
        </div>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-3">
        {trustAnswers.map((item) => (
          <div key={item.q}>
            <p className="text-[13.5px] font-semibold text-ink">{item.q}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{item.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 text-center">
        <Link
          href="/logg-inn?tab=registrer"
          className="inline-flex rounded-md bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-ink"
        >
          Start enkel sjekk — gratis
        </Link>
      </div>
    </main>
  );
}
