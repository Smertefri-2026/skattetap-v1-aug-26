import { Badge } from "@/components/design-system";

function DocumentsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6" aria-hidden="true">
      <path d="M5 4h8l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M13 4v4h4" />
      <path d="M8 13h6M8 16h6" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <div className="flex items-center justify-center px-1 text-ink-faint">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0 rotate-90 md:rotate-0" aria-hidden="true">
        <path d="M4 12h16" />
        <path d="M14 6l6 6-6 6" />
      </svg>
    </div>
  );
}

/**
 * Same visual vocabulary as the homepage's BevismotorPipeline (bordered
 * nodes + arrows, primary-highlighted engine node), but a distinct third
 * node -- this one lands on Levende saksbilde as the aggregation point,
 * matching how the "SkatteTap jobber for deg" step group actually reads.
 */
export function ProsessFlow() {
  return (
    <div>
      <div className="mb-4 flex justify-center">
        <Badge tone="neutral">Eksempel</Badge>
      </div>
      <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-center md:gap-2">
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface p-4 text-center shadow-sm md:w-[150px]">
          <DocumentsIcon />
          <p className="text-[12.5px] font-semibold text-ink">Dokumenter</p>
          <p className="text-[11.5px] text-ink-faint">avtaler, vedtak, kvitteringer</p>
        </div>

        <ArrowRight />

        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-primary bg-primary-subtle p-4 text-center shadow-sm md:w-[170px]">
          <p className="text-[12.5px] font-semibold text-primary-ink">SkatteTaps Bevismotor</p>
          <p className="text-[11.5px] text-primary-ink">fakta, datoer og beløp -- konflikter -- dokumentasjonshull</p>
        </div>

        <ArrowRight />

        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-4 text-center shadow-sm md:w-[170px]">
          <p className="text-[12.5px] font-semibold text-ink">Levende saksbilde</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
            <Badge tone="success">4 fakta</Badge>
            <Badge tone="warning">1 konflikt</Badge>
            <Badge tone="neutral">1 hull</Badge>
          </div>
        </div>

        <ArrowRight />

        <div className="flex flex-col items-center gap-1 rounded-lg border border-primary bg-primary-subtle p-4 text-center shadow-sm md:w-[180px]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-ink">
            Neste anbefalte handling
          </p>
          <p className="text-[12.5px] font-medium text-ink">
            Last opp lønnsslipp for 2024
          </p>
        </div>
      </div>
    </div>
  );
}
