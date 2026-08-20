"use client";

import { FormEvent, useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/design-system";

/**
 * Adapted from PresseSjekk's proven embedded-payment component
 * (src/components/checkout/StripePaymentElementBox.tsx there): same
 * stripe.confirmPayment({elements, confirmParams, redirect: "if_required"})
 * call, same succeeded-status handling. The one addition is the angrerett
 * gate -- the button stays disabled until the checkbox in
 * CheckoutOrderSummary is checked, and consent is (re-)stamped
 * server-side right before confirming, not merely typed into a checkbox.
 */
export function StripePaymentElementBox({
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
  const stripe = useStripe();
  const elements = useElements();

  const [isPaying, setIsPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements || !angrerettAccepted) return;

    setIsPaying(true);
    setErrorMessage("");

    await fetch(`/api/cases/${caseId}/payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCode, angrerettAccepted: true }),
    }).catch(() => {});

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (result.error) {
      setErrorMessage(result.error.message ?? "Betalingen kunne ikke fullføres.");
      setIsPaying(false);
      return;
    }

    if (result.paymentIntent?.status === "succeeded") {
      window.location.href = returnUrl;
      return;
    }

    setIsPaying(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
      <div className="rounded-md border border-border-strong bg-surface p-3">
        <PaymentElement />
      </div>

      {errorMessage && <p className="text-[13px] text-danger-ink">{errorMessage}</p>}

      <Button type="submit" disabled={!stripe || !elements || !angrerettAccepted || isPaying}>
        {isPaying ? "Fullfører betaling..." : "Betal nå"}
      </Button>
    </form>
  );
}
