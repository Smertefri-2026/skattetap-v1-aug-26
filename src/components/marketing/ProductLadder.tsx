import { stageLabels, stageOrder } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";

/**
 * Reuses stageLabels/stageOrder from the real product -- the same names
 * shown in Saksgang inside a case -- so this ladder can never drift out of
 * sync with what the platform actually calls each level.
 */
const descriptions: Record<CaseStage, string> = {
  "enkel-sjekk": "Svar på noen få spørsmål om saken din. Gratis, og du får en vurdering med en gang.",
  "full-sjekk": "Last opp dokumentene dine. Vi bygger en strukturert rapport med fakta, tidslinje og regelverk.",
  skatteendring: "Vi hjelper deg formulere henvendelsen til Skatteetaten, og tolker svaret når det kommer.",
  "komplett-sak": "En dypere analyse: samlet kronologi, konfliktdeteksjon og et fullstendig dokumentkart.",
  "strategisk-utredning":
    "For flere saker over tid: mønstre mellom år, samlet økonomisk eksponering og prioriterte handlingsløp.",
};

export function ProductLadder() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stageOrder.map((stage, i) => (
        <div key={stage} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <span className="font-mono text-[12px] text-ink-faint">Steg {i + 1}</span>
          <h3 className="mt-2 text-[15px] font-semibold text-ink">{stageLabels[stage]}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{descriptions[stage]}</p>
        </div>
      ))}
    </div>
  );
}
