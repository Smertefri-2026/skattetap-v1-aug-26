"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { Product } from "@/lib/products/types";
import { StripePaymentElementBox } from "./StripePaymentElementBox";

const ANGRERETT_TEXT =
  "Jeg ønsker at SkatteTap starter behandlingen av saken min med en gang, før angrefristen på 14 dager er utløpt. Jeg forstår at jeg ved bruk av angreretten etter at arbeidet har startet kan måtte betale for den delen av tjenesten som allerede er levert, og at angreretten bortfaller når tjenesten er fullstendig levert.";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

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
 * Owns the clientSecret fetch for exactly one case+product combination.
 * The parent remounts this via `key={caseId:productCode}` whenever either
 * changes, instead of manually resetting state inside an effect (which
 * React's own lint rules flag as a footgun -- a fresh mount already starts
 * with fresh state, so there's nothing to reset).
 */
function PaymentIntentPanel({
  caseId,
  productCode,
  angrerettAccepted,
  returnUrl,
}: {
  caseId: string;
  productCode: string;
  angrerettAccepted: boolean;
  returnUrl: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [prepError, setPrepError] = useState<string | null>(null);
  // Guards against React StrictMode's dev-only double-invoke of this
  // effect: without it, two concurrent requests can both pass the
  // server's "reuse a pending purchase" check before either has
  // committed its insert, creating two purchase rows/PaymentIntents for
  // the same case+product. Survives across the fresh mount this ref is
  // created in -- a genuine case/product change gets a new mounted
  // instance entirely via the parent's key={caseId:productCode}, so this
  // never suppresses a legitimate re-fetch.
  const fetchStarted = useRef(false);

  useEffect(() => {
    if (fetchStarted.current) return;
    fetchStarted.current = true;

    let cancelled = false;

    fetch(`/api/cases/${caseId}/payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCode }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setPrepError(body.error ?? "Kunne ikke klargjøre betaling.");
          return;
        }
        setClientSecret(body.clientSecret);
      })
      .catch(() => {
        if (!cancelled) setPrepError("Kunne ikke klargjøre betaling.");
      })
      .finally(() => {
        if (!cancelled) setPreparing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [caseId, productCode]);

  return (
    <>
      {prepError && <p className="text-[13px] text-danger-ink">{prepError}</p>}

      {preparing && <p className="text-[13px] text-ink-faint">Klargjør sikkert betalingsfelt...</p>}

      {clientSecret && stripePromise && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#2f6fed",
                colorBackground: "#ffffff",
                colorText: "#101828",
                colorDanger: "#d92d20",
                fontFamily: "inherit",
                borderRadius: "8px",
              },
            },
          }}
        >
          <StripePaymentElementBox
            caseId={caseId}
            productCode={productCode}
            angrerettAccepted={angrerettAccepted}
            returnUrl={returnUrl}
          />
        </Elements>
      )}
    </>
  );
}

/**
 * Column 3. Always represents a paid product -- /utsjekk redirects
 * enkel-sjekk elsewhere before this ever renders (see the page
 * component). Pricing is never recomputed here -- product.price_kr and
 * costKr both come straight from the server's getUpgradeQuote() call
 * (see the page component); this only formats/derives display lines
 * ("tidligere kjøpt verdi" = price_kr - costKr).
 *
 * Payment is embedded (Stripe Payment Element), not a redirect -- pattern
 * adapted from PresseSjekk's own /utsjekk: fetch a PaymentIntent
 * clientSecret as soon as a case is selected, mount <Elements> around
 * StripePaymentElementBox once it arrives. automatic_payment_methods on
 * the server side (createPaymentIntent.ts) means whatever methods show up
 * here (card, Klarna, ...) are exactly what Stripe's own account
 * configuration actually supports -- nothing hardcoded in this UI.
 */
export function CheckoutOrderSummary({
  isLoggedIn,
  productLabel,
  product,
  caseId,
  alreadyHasAccess,
  costKr,
}: {
  isLoggedIn: boolean;
  productLabel: string;
  product: Product | null;
  caseId?: string;
  alreadyHasAccess?: boolean;
  costKr?: number;
}) {
  const [angrerettAccepted, setAngrerettAccepted] = useState(false);

  const productCode = product?.product_code;

  const priceKr = product?.price_kr ?? 0;
  const payingNow = costKr ?? priceKr;
  const previouslyPaidValue = priceKr - payingNow;
  const returnUrl =
    typeof window !== "undefined" && caseId
      ? `${window.location.origin}/min-side/saker/${caseId}?checkout=success`
      : "";

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

      {isLoggedIn && caseId && productCode && !alreadyHasAccess && (
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

          <PaymentIntentPanel
            key={`${caseId}:${productCode}`}
            caseId={caseId}
            productCode={productCode}
            angrerettAccepted={angrerettAccepted}
            returnUrl={returnUrl}
          />

          <p className="text-[12px] text-ink-faint">
            SkatteTap lagrer ikke kortopplysningene dine. Betalingsopplysninger håndteres av Stripe.
          </p>
        </>
      )}
    </div>
  );
}
