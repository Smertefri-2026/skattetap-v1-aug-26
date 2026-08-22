"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/design-system";
import { stageLabels } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";
import type { CapacityStatus as CapacityStatusValue } from "@/lib/products/capacity";

export interface CapacityAddonOption {
  productCode: string;
  name: string;
  priceKr: number;
  addonDocuments: number;
  addonTotalMb: number;
}

function AddonPurchaseButton({ caseId, addon }: { caseId: string; addon: CapacityAddonOption }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/cases/${caseId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCode: addon.productCode }),
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
    <div>
      <Button onClick={handlePurchase} disabled={loading} variant="secondary">
        {loading
          ? "Starter betaling..."
          : `Kjøp ekstra kapasitet (+${addon.addonDocuments} dok. / +${addon.addonTotalMb} MB) — ${addon.priceKr.toLocaleString("no-NO")} kr`}
      </Button>
      {error && <p className="mt-1 text-[12px] text-danger-ink">{error}</p>}
    </div>
  );
}

export function CapacityStatus({
  caseId,
  currentStage,
  documentsUsed,
  maxDocuments,
  mbUsed,
  maxTotalMb,
  status,
  recommendedUpgradeStage,
  addonOptions,
}: {
  caseId: string;
  currentStage: CaseStage;
  documentsUsed: number;
  maxDocuments: number;
  mbUsed: number;
  maxTotalMb: number;
  status: CapacityStatusValue;
  recommendedUpgradeStage: CaseStage | null;
  addonOptions: CapacityAddonOption[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-alt p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-ink-soft">
          {documentsUsed} av {maxDocuments} dokumenter · {Math.round(mbUsed)} av {maxTotalMb} MB
        </span>
        {status === "near_limit" && <Badge tone="warning">Nærmer seg grensen</Badge>}
        {status === "limit_reached" && <Badge tone="danger">Grense nådd</Badge>}
      </div>

      {status === "near_limit" && (
        <p className="text-[12.5px] text-ink-soft">
          Du nærmer deg analysekapasiteten som er inkludert i {stageLabels[currentStage]}.
        </p>
      )}

      {status === "limit_reached" && (
        <div className="flex flex-col gap-2">
          <p className="text-[12.5px] text-ink">
            Saken har brukt kapasiteten som er inkludert i {stageLabels[currentStage]}.
            {recommendedUpgradeStage
              ? " For å analysere mer materiale må saken oppgraderes."
              : " Du kan kjøpe ekstra analysekapasitet og fortsette på samme sak."}
          </p>
          {recommendedUpgradeStage && (
            <Link
              href={`/min-side/saker/${caseId}?steg=${recommendedUpgradeStage}`}
              className="inline-flex w-fit rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-ink"
            >
              Se {stageLabels[recommendedUpgradeStage]}
            </Link>
          )}
          {!recommendedUpgradeStage && addonOptions.length > 0 && (
            <div className="flex flex-col gap-2">
              {addonOptions.map((addon) => (
                <AddonPurchaseButton key={addon.productCode} caseId={caseId} addon={addon} />
              ))}
            </div>
          )}
          {!recommendedUpgradeStage && addonOptions.length === 0 && (
            <p className="text-[12.5px] text-ink-faint">
              Ekstra analysekapasitet er ikke tilgjengelig for kjøp ennå.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
