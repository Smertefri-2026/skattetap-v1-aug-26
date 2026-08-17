import { stageLabels } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";

export function CaseWorkbenchPlaceholder({ stage }: { stage: CaseStage }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-alt p-10 text-center">
      <p className="text-[15px] font-semibold text-ink">
        {stageLabels[stage]} bygges i en senere fase
      </p>
      <p className="mt-2 max-w-sm text-[13.5px] text-ink-soft">
        Saken er opprettet og klar. Selve arbeidsflaten for dette steget
        kommer i sin egen fase.
      </p>
    </div>
  );
}
