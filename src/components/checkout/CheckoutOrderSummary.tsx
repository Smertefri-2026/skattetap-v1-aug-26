"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/design-system";
import type { Product } from "@/lib/products/types";

const ANGRERETT_TEXT =
  "Jeg ønsker at SkatteTap starter behandlingen av saken min med en gang, før angrefristen på 14 dager er utløpt. Jeg forstår at jeg ved bruk av angreretten etter at arbeidet har startet kan måtte betale for den delen av tjenesten som allerede er levert, og at angreretten bortfaller når tjenesten er fullstendig levert.";

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[13.5px]">
      <span className={muted ? "text-ink-faint" : "text-ink-soft"}>{label}</span>
      <span className={muted ? "text-ink-faint" : "font-medium text-ink"}>{value}</span>
    </div>
  );
}

function kr(n: number) {
  return `${n.toLocaleString("no-NO")} kr`;
}

/**
 * Column 3. Pricing is never recomputed here -- product.price_kr and
 * costKr both come straight from the server's getUpgradeQuote() call
 * (see the page component); this only formats/derives display lines
 * ("tidligere kjøpt verdi" = price_kr - costKr) and handles the angrerett
 * checkbox + the same fetch-and-redirect-to-Stripe call PurchasePrompt
 * already makes.
 */
export function CheckoutOrderSummary({
  isFree,
  isLoggedIn,
  productLabel,
  product,
  caseId,
  alreadyHasAccess,
  costKr,
}: {
  isFree: boolean;
  isLoggedIn: boolean;
  productLabel: string;
  product: Product | null;
  caseId?: string;
  alreadyHasAccess?: boolean;
  costKr?: number;
}) {
  const [angrerettAccepted, setAngrerettAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePayment() {
    if (!caseId || !product) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/cases/${caseId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCode: product.product_code, angrerettAccepted: true }),
    });

    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Kunne ikke starte betaling. Prøv igjen.");
      setLoading(false);
    }
  }

  if (isFree) {
    return (
      <div className="flex flex-col gap-4">
        <Line label="Enkel sjekk" value="Gratis" />
        <p className="text-[13px] text-ink-soft">Ingen betaling nødvendig for å komme i gang.</p>
        {isLoggedIn && caseId ? (
          <Link
            href={`/min-side/saker/${caseId}`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-[18px] py-[10px] text-sm font-semibold text-white hover:bg-primary-ink"
          >
            Gå til saken
          </Link>
        ) : (
          <p className="text-[13px] text-ink-faint">
            {isLoggedIn ? "Velg eller opprett en sak til venstre for å fortsette." : "Opprett konto eller logg inn for å starte."}
          </p>
        )}
      </div>
    );
  }

  const priceKr = product?.price_kr ?? 0;
  const payingNow = costKr ?? priceKr;
  const previouslyPaidValue = priceKr - payingNow;

  return (
    <div className="flex flex-col gap-4">
      <Line label={productLabel} value={kr(priceKr)} />
      {previouslyPaidValue > 0 && <Line label="Tidligere kjøpt verdi" value={`-${kr(previouslyPaidValue)}`} muted />}
      <div className="h-px bg-border" />
      <Line label="Å betale nå" value={alreadyHasAccess ? "0 kr" : kr(payingNow)} />

      {!isLoggedIn && (
        <p className="text-[13px] text-ink-faint">Opprett konto eller logg inn til venstre for å gå videre.</p>
      )}

      {isLoggedIn && !caseId && (
        <p className="text-[13px] text-ink-faint">Velg eller opprett en sak til venstre for å gå videre.</p>
      )}

      {isLoggedIn && caseId && alreadyHasAccess && (
        <div>
          <p className="text-[13px] text-ink-soft">Du har allerede tilgang til dette nivået på denne saken.</p>
          <Link href={`/min-side/saker/${caseId}`} className="mt-2 inline-block text-[13px] font-medium text-primary-ink hover:underline">
            Gå til saken →
          </Link>
        </div>
      )}

      {isLoggedIn && caseId && !alreadyHasAccess && (
        <>
          <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
            <input
              type="checkbox"
              checked={angrerettAccepted}
              onChange={(e) => setAngrerettAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong"
            />
            <span>{ANGRERETT_TEXT}</span>
          </label>
          <p className="text-[12px] text-ink-faint">
            Les mer i{" "}
            <Link href="/vilkar" target="_blank" className="text-primary-ink hover:underline">
              vilkårene
            </Link>{" "}
            (punkt 7, angrerett).
          </p>

          {error && <p className="text-[13px] text-danger-ink">{error}</p>}

          <Button onClick={handlePayment} disabled={!angrerettAccepted || loading} className="mt-1">
            {loading ? "Starter betaling..." : "Gå til betaling"}
          </Button>
          <p className="text-[12px] text-ink-faint">
            SkatteTap lagrer ikke kortopplysningene dine. Betaling håndteres av Stripe.
          </p>
        </>
      )}
    </div>
  );
}
