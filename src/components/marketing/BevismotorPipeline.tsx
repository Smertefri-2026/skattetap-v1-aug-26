import { Badge } from "@/components/design-system";

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6" aria-hidden="true">
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center px-1 text-ink-faint md:rotate-0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0 rotate-90 md:rotate-0" aria-hidden="true">
        <path d="M4 12h16" />
        <path d="M14 6l6 6-6 6" />
      </svg>
    </div>
  );
}

/**
 * The "how it actually works" visual the homepage was missing -- not a
 * stock photo, a real illustration of the pipeline using the same Badge
 * tones/labels and NextActionCard styling the logged-in product uses, so
 * it reads as a true preview rather than decoration. Explicitly labeled
 * as an example, no invented numbers anywhere.
 */
export function BevismotorPipeline() {
  return (
    <div>
      <div className="mb-4 flex justify-center">
        <Badge tone="neutral">Eksempel</Badge>
      </div>
      <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-center md:gap-2">
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface p-4 text-center shadow-sm md:w-[150px]">
          <DocumentIcon />
          <p className="text-[12.5px] font-semibold text-ink">Dokument</p>
          <p className="text-[11.5px] text-ink-faint">arbeidsavtale.pdf</p>
        </div>

        <FlowArrow />

        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-primary bg-primary-subtle p-4 text-center shadow-sm md:w-[170px]">
          <p className="text-[12.5px] font-semibold text-primary-ink">SkatteTaps Bevismotor</p>
          <p className="text-[11.5px] text-primary-ink">leser, sjekker, begrunner</p>
        </div>

        <FlowArrow />

        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-4 shadow-sm md:w-[190px]">
          <div className="flex items-center gap-2">
            <Badge tone="success">Dokumentert</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="warning">Motstridende</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">Dokumentasjonshull</Badge>
          </div>
        </div>

        <FlowArrow />

        <div className="flex flex-col items-center gap-1 rounded-lg border border-primary bg-primary-subtle p-4 text-center shadow-sm md:w-[190px]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-ink">
            Neste anbefalte handling
          </p>
          <p className="text-[12.5px] font-medium text-ink">
            Last opp arbeidsgivers bekreftelse
          </p>
        </div>
      </div>
    </div>
  );
}
