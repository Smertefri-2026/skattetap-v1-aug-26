import { stageOrder } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";

/** The four paid tiers, in order -- stageOrder without enkel-sjekk (free,
 * never sold through a checkout). Shared so /utsjekk's product list and
 * its enkel-sjekk redirect guard can't drift apart. */
export const paidStageOrder: CaseStage[] = stageOrder.filter((s) => s !== "enkel-sjekk");

/**
 * Single source of truth for where a product-tier CTA points, shared by
 * ProductLadder (homepage) and the Priser page so the two can never drift
 * apart. Purchases are case-scoped, so a paid tier can't check out
 * directly from a marketing page -- it routes into /min-side, where
 * ProductIntentBanner lets the visitor pick (or create) the case, then
 * hands off entirely to the existing PurchaseGate/checkout flow for that
 * case. No parallel checkout. The "next" param survives login and the
 * email-confirmation redirect chain, so a logged-out visitor lands back
 * on the same intent.
 */
export function getPurchaseHref(stage: CaseStage, isLoggedIn: boolean): string {
  if (stage === "enkel-sjekk") {
    return isLoggedIn ? "/min-side" : "/logg-inn?tab=registrer";
  }
  const target = `/min-side?produkt=${stage}`;
  return isLoggedIn ? target : `/logg-inn?tab=registrer&next=${encodeURIComponent(target)}`;
}

export const purchaseCtaLabel: Record<CaseStage, string> = {
  "enkel-sjekk": "Start enkel sjekk",
  "full-sjekk": "Kjøp Full sjekk",
  skatteendring: "Kjøp Skatteendring",
  "komplett-sak": "Kjøp Komplett sak",
  "strategisk-utredning": "Kjøp Strategisk utredning",
};
