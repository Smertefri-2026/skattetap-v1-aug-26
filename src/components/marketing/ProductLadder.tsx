import Link from "next/link";
import { stageLabels, stageOrder } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";
import { getProducts } from "@/lib/products/catalog";
import { createClient } from "@/lib/supabase/server";

/**
 * Reuses stageLabels/stageOrder from the real product -- the same names
 * shown in Saksgang inside a case -- so this ladder can never drift out of
 * sync with what the platform actually calls each level. Prices come live
 * from the products table, never a hardcoded list here.
 */
const descriptions: Record<CaseStage, string> = {
  "enkel-sjekk": "Svar på noen få spørsmål om saken din. Gratis, og du får en vurdering med en gang.",
  "full-sjekk": "Last opp dokumentene dine. Vi bygger en strukturert rapport med fakta, tidslinje og regelverk.",
  skatteendring: "Vi hjelper deg formulere henvendelsen til Skatteetaten, og tolker svaret når det kommer.",
  "komplett-sak": "En dypere analyse: samlet kronologi, konfliktdeteksjon og et fullstendig dokumentkart.",
  "strategisk-utredning":
    "For flere saker over tid: mønstre mellom år, samlet økonomisk eksponering og prioriterte handlingsløp.",
};

const ctaLabel: Record<CaseStage, string> = {
  "enkel-sjekk": "Start enkel sjekk",
  "full-sjekk": "Kjøp Full sjekk",
  skatteendring: "Kjøp Skatteendring",
  "komplett-sak": "Kjøp Komplett sak",
  "strategisk-utredning": "Kjøp Strategisk utredning",
};

export async function ProductLadder() {
  const supabase = await createClient();
  const [{ data: userData }, products] = await Promise.all([supabase.auth.getUser(), getProducts(supabase)]);
  const isLoggedIn = userData.user != null;
  const priceByCode = new Map(products.map((p) => [p.product_code, p.price_kr]));

  // Purchases are case-scoped, so a paid tier from the homepage can't check
  // out directly -- it routes into /min-side, where ProductIntentBanner
  // lets the visitor pick (or create) the case, then hands off entirely to
  // the existing PurchaseGate/checkout flow for that case. No parallel
  // checkout. The "next" param survives login and the email-confirmation
  // redirect chain, so a logged-out visitor lands back on the same intent.
  function hrefFor(stage: CaseStage): string {
    if (stage === "enkel-sjekk") {
      return isLoggedIn ? "/min-side" : "/logg-inn?tab=registrer";
    }
    const target = `/min-side?produkt=${stage}`;
    return isLoggedIn ? target : `/logg-inn?tab=registrer&next=${encodeURIComponent(target)}`;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stageOrder.map((stage, i) => {
        const priceKr = stage === "enkel-sjekk" ? 0 : priceByCode.get(stage);
        return (
          <div key={stage} className="flex flex-col rounded-lg border border-border bg-surface p-5 shadow-sm">
            <span className="font-mono text-[12px] text-ink-faint">Steg {i + 1}</span>
            <h3 className="mt-2 text-[15px] font-semibold text-ink">{stageLabels[stage]}</h3>
            <p className="mt-1 text-[13px] font-medium text-ink-faint">
              {stage === "enkel-sjekk" ? "Gratis" : priceKr != null ? `${priceKr.toLocaleString("no-NO")} kr` : ""}
            </p>
            <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-soft">{descriptions[stage]}</p>
            <Link
              href={hrefFor(stage)}
              className={
                stage === "enkel-sjekk"
                  ? "mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-ink"
                  : "mt-4 inline-flex items-center justify-center rounded-md border border-border-strong bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:bg-surface-alt"
              }
            >
              {ctaLabel[stage]}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
