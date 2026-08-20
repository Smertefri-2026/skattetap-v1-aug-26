import type { Metadata } from "next";
import { CheckoutAuthPanel } from "@/components/checkout/CheckoutAuthPanel";
import { CheckoutCasePicker } from "@/components/checkout/CheckoutCasePicker";
import { CheckoutOrderSummary } from "@/components/checkout/CheckoutOrderSummary";
import { CheckoutProductPicker } from "@/components/checkout/CheckoutProductPicker";
import { stageOrder } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";
import { getProducts } from "@/lib/products/catalog";
import { getUpgradeQuote } from "@/lib/products/entitlement";
import { createClient } from "@/lib/supabase/server";

/**
 * One-page checkout: Velg produkt -> Konto/innlogging -> Ordresammendrag,
 * all in one URL (?produkt=<stage>&sak=<case-id>), built entirely on the
 * existing product/case/entitlement/Stripe architecture -- no parallel
 * auth, no parallel checkout, no new product model. See
 * src/lib/products/entitlement.ts (pricing/upgrade math),
 * src/lib/purchases/createCheckout.ts (Stripe session), and
 * src/lib/cases/actions.ts (case creation, now with an optional
 * returnTo="utsjekk" so a new case lands back here instead of on the case
 * page).
 *
 * This does not yet replace the older per-case PurchasePrompt/PurchaseGate
 * flow (still used from /min-side/saker/[id]) -- both work side by side
 * until this one is fully verified, per instruction.
 *
 * What could later generalize into a reusable Remøy AI OS checkout module
 * (not done now, deliberately):
 *  - The 3-column layout shell (product / account / order-summary) and its
 *    mobile stacking order are entirely generic -- only the column
 *    *contents* here are SkatteTap-specific (product copy, case concept).
 *  - The angrerett-consent pattern (required checkbox -> server-stamped
 *    accepted_at on the purchase row, optional at the API layer so an
 *    older non-compliant call site doesn't break) is a reusable shape for
 *    any product needing point-of-purchase legal consent, not just this
 *    one's exact Norwegian wording.
 *  - CheckoutAuthPanel's "lean signup, more fields later on account
 *    settings" split is a reusable pattern anywhere a full profile isn't
 *    needed at the moment of first purchase.
 */

export const metadata: Metadata = {
  title: "Utsjekk",
  description: "Velg pakke, bekreft konto og betal -- alt på én side.",
};

function isStage(value: string | undefined): value is CaseStage {
  return stageOrder.includes(value as CaseStage);
}

export default async function UtsjekkPage({
  searchParams,
}: {
  searchParams: Promise<{ produkt?: string; sak?: string }>;
}) {
  const params = await searchParams;
  const produkt: CaseStage = isStage(params.produkt) ? params.produkt : "full-sjekk";
  const isFree = produkt === "enkel-sjekk";

  const supabase = await createClient();
  const [{ data: userData }, products] = await Promise.all([supabase.auth.getUser(), getProducts(supabase)]);
  const user = userData.user;
  const priceByStage = Object.fromEntries(products.map((p) => [p.product_code, p.price_kr])) as Partial<
    Record<CaseStage, number>
  >;
  const product = products.find((p) => p.product_code === produkt) ?? null;

  let cases: { id: string; title: string }[] = [];
  let profileName: string | null = null;
  if (user) {
    const [{ data: caseRows }, { data: profile }] = await Promise.all([
      supabase.from("cases").select("id, title").order("updated_at", { ascending: false }),
      supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
    ]);
    cases = caseRows ?? [];
    profileName = profile?.first_name ?? null;
  }

  const selectedCaseId = params.sak && cases.some((c) => c.id === params.sak) ? params.sak : undefined;

  let quote: Awaited<ReturnType<typeof getUpgradeQuote>> = null;
  if (!isFree && selectedCaseId) {
    quote = await getUpgradeQuote(supabase, selectedCaseId, produkt);
  }

  const next = `/utsjekk?produkt=${produkt}`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Utsjekk</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">Velg pakke, bekreft konto og betal</h1>
      <p className="mt-3 max-w-xl text-[15px] text-ink-soft">
        Kjøpet knyttes til Min side, slik at du kan lagre saken, laste ned rapporter og bygge videre med
        dokumentasjon senere.
      </p>

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-primary-ink">1. Din pakke</p>
          <h2 className="mt-1 text-[19px] font-semibold text-ink">Velg produkt</h2>
          <div className="mt-4">
            <CheckoutProductPicker selected={produkt} sak={selectedCaseId} priceByStage={priceByStage} />
          </div>
        </div>

        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-primary-ink">
            2. Konto for Min side
          </p>
          <h2 className="mt-1 text-[19px] font-semibold text-ink">Konto og tilgang</h2>
          <div className="mt-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
            {user ? (
              <CheckoutCasePicker
                produkt={produkt}
                cases={cases}
                selectedCaseId={selectedCaseId}
                email={user.email ?? ""}
                name={profileName}
              />
            ) : (
              <CheckoutAuthPanel next={next} />
            )}
          </div>
        </div>

        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-primary-ink">3. Betaling</p>
          <h2 className="mt-1 text-[19px] font-semibold text-ink">Ordresammendrag</h2>
          <div className="mt-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
            <CheckoutOrderSummary
              isFree={isFree}
              isLoggedIn={!!user}
              productLabel={product?.name ?? "Enkel sjekk"}
              product={product}
              caseId={selectedCaseId}
              alreadyHasAccess={quote?.alreadyHasAccess}
              costKr={quote?.costKr}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
