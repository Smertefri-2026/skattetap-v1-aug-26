import { stageOrder } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";

/** The four paid tiers, in order -- stageOrder without enkel-sjekk (free,
 * never sold through a checkout). Shared so /utsjekk's product list and
 * its enkel-sjekk redirect guard can't drift apart. */
export const paidStageOrder: CaseStage[] = stageOrder.filter((s) => s !== "enkel-sjekk");

/**
 * Single source of truth for where a product-tier CTA points, shared by
 * ProductLadder (homepage) and the Priser page so the two can never drift
 * apart. Enkel sjekk is free and keeps its original entry point (straight
 * to /min-side, no checkout involved). The four paid tiers route to the
 * one-page checkout at /utsjekk, which handles case selection/creation
 * and payment itself -- no parallel checkout. The "next" param survives
 * login and the email-confirmation redirect chain, so a logged-out
 * visitor lands back on the same intent.
 */
export function getPurchaseHref(stage: CaseStage, isLoggedIn: boolean): string {
  if (stage === "enkel-sjekk") {
    return isLoggedIn ? "/min-side" : "/logg-inn?tab=registrer";
  }
  const target = `/utsjekk?produkt=${stage}`;
  return isLoggedIn ? target : `/logg-inn?tab=registrer&next=${encodeURIComponent(target)}`;
}

export const purchaseCtaLabel: Record<CaseStage, string> = {
  "enkel-sjekk": "Start enkel sjekk",
  "full-sjekk": "Kjøp Full sjekk",
  skatteendring: "Kjøp Skatteendring",
  "komplett-sak": "Kjøp Komplett sak",
  "strategisk-utredning": "Kjøp Strategisk utredning",
};
