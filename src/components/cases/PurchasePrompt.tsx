"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/design-system";

export function PurchasePrompt({
  caseId,
  productCode,
  productName,
  priceKr,
  checkoutPending,
}: {
  caseId: string;
  productCode: string;
  productName: string;
  priceKr: number;
  checkoutPending: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/cases/${caseId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCode }),
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

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface-alt p-10 text-center">
      {checkoutPending && (
        <p className="text-[13px] text-ink-soft">
          Betalingen behandles fortsatt. Oppdater siden om et øyeblikk hvis den ikke dukker opp
          automatisk.
        </p>
      )}
      <Badge tone="info">Låst</Badge>
      <p className="text-[15px] font-semibold text-ink">{productName} er ikke kjøpt ennå</p>
      <p className="max-w-sm text-[13.5px] text-ink-soft">
        Lås opp for {priceKr.toLocaleString("no-NO")} kr for å fortsette.
      </p>
      <Button onClick={handlePurchase} disabled={loading}>
        {loading ? "Starter betaling..." : `Kjøp for ${priceKr.toLocaleString("no-NO")} kr`}
      </Button>
      {error && <p className="text-[13px] text-danger-ink">{error}</p>}
    </div>
  );
}
