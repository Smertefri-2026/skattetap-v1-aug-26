import { stageLabels, stageOrder } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";

/**
 * Illustrates the upgrade/mellomlegg principle -- a small ascending
 * staircase in the same bordered-card, primary-accent language used
 * elsewhere, not a generic graphic. Prices are passed in from the real
 * products table, never hardcoded here.
 */
export function UpgradeStaircase({ priceByStage }: { priceByStage: Partial<Record<CaseStage, number>> }) {
  return (
    <div>
      <div className="flex items-end justify-start gap-2 overflow-x-auto sm:justify-center sm:gap-3">
        {stageOrder.map((stage, i) => {
          const priceKr = stage === "enkel-sjekk" ? 0 : priceByStage[stage];
          return (
            <div
              key={stage}
              className="flex w-[92px] shrink-0 flex-col items-center justify-end rounded-t-md border border-b-0 border-primary bg-primary-subtle px-2 pb-2.5 pt-3 text-center sm:w-[108px]"
              style={{ height: `${56 + i * 22}px` }}
            >
              <p className="text-[11.5px] font-semibold leading-tight text-primary-ink">{stageLabels[stage]}</p>
              <p className="mt-1 text-[11px] text-primary-ink">
                {stage === "enkel-sjekk" ? "Gratis" : priceKr != null ? `${priceKr.toLocaleString("no-NO")} kr` : ""}
              </p>
            </div>
          );
        })}
      </div>
      <div className="h-px bg-border-strong" />
      <p className="mx-auto mt-4 max-w-md text-center text-[13px] text-ink-soft">
        Du betaler bare mellomlegget når du går videre. Går du fra Full sjekk til Komplett sak,
        betaler du kun differansen mellom prisene -- aldri full pris på nytt.
      </p>
    </div>
  );
}
