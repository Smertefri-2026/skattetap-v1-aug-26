"use client";

import Link from "next/link";
import { Badge, Card } from "@/components/design-system";
import { stageLabels } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";
import { paidStageOrder } from "@/lib/products/purchaseLinks";

const descriptions: Record<CaseStage, string> = {
  "enkel-sjekk": "Svar på noen få spørsmål om saken din. Gratis, og du får en vurdering med en gang.",
  "full-sjekk": "Last opp dokumentene dine. Vi bygger en strukturert rapport med fakta, tidslinje og regelverk.",
  skatteendring: "Vi hjelper deg formulere henvendelsen til Skatteetaten, og tolker svaret når det kommer.",
  "komplett-sak": "En dypere analyse: samlet kronologi, konfliktdeteksjon og et fullstendig dokumentkart.",
  "strategisk-utredning":
    "For flere saker over tid: mønstre mellom år, samlet økonomisk eksponering og prioriterte handlingsløp.",
};

const features: Record<CaseStage, string[]> = {
  "enkel-sjekk": ["Rask KI-vurdering", "Ingen dokumentopplasting", "Helt gratis"],
  "full-sjekk": ["Full dokumentanalyse", "Strukturert rapport med fakta og tidslinje", "Nedlastbar PDF"],
  skatteendring: ["Ferdig utkast til henvendelse", "Tolker svaret fra Skatteetaten", "Bygger på Full sjekk"],
  "komplett-sak": ["Samlet kronologi", "Konfliktdeteksjon på tvers av dokumenter", "Fullstendig dokumentkart"],
  "strategisk-utredning": ["Mønstre mellom år", "Samlet økonomisk eksponering", "Prioriterte handlingsløp"],
};

/**
 * Column 1. Plain server-rendered links (?produkt=X, preserving ?sak=) --
 * switching product is a normal navigation, not client state, so pricing
 * and the upgrade quote in column 3 are always freshly computed
 * server-side for whatever is selected. No client JS needed here.
 */
export function CheckoutProductPicker({
  selected,
  sak,
  priceByStage,
}: {
  selected: CaseStage;
  sak?: string;
  priceByStage: Partial<Record<CaseStage, number>>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="checkout-product-select" className="text-[13px] font-medium text-ink">
          Pakke
        </label>
        <select
          id="checkout-product-select"
          defaultValue={selected}
          className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary sm:hidden"
          onChange={(e) => {
            window.location.href = `/utsjekk?produkt=${e.target.value}${sak ? `&sak=${sak}` : ""}`;
          }}
        >
          {paidStageOrder.map((stage) => (
            <option key={stage} value={stage}>
              {stageLabels[stage]} — {(priceByStage[stage] ?? 0).toLocaleString("no-NO")} kr
            </option>
          ))}
        </select>
      </div>

      <div className="hidden flex-col gap-2 sm:flex">
        {paidStageOrder.map((stage) => {
          const isSelected = stage === selected;
          const href = `/utsjekk?produkt=${stage}${sak ? `&sak=${sak}` : ""}`;
          return (
            <Link key={stage} href={href}>
              <Card selected={isSelected} className="!p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-semibold text-ink">{stageLabels[stage]}</span>
                  <span className="text-[13px] font-medium text-ink-faint">
                    {(priceByStage[stage] ?? 0).toLocaleString("no-NO")} kr
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-2 rounded-lg border border-primary bg-primary-subtle p-5">
        <Badge tone="info">Enkeltkjøp</Badge>
        <h3 className="mt-3 text-[19px] font-semibold text-ink">{stageLabels[selected]}</h3>
        <p className="text-[14px] font-medium text-ink-faint">
          {(priceByStage[selected] ?? 0).toLocaleString("no-NO")} kr
        </p>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">{descriptions[selected]}</p>
        <ul className="mt-4 flex flex-col gap-1.5">
          {features[selected].map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-ink-soft">
              <span className="mt-0.5 text-primary-ink">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
