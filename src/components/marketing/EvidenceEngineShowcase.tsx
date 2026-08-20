import { Badge } from "@/components/design-system";

/**
 * A labeled, illustrative example of how Evidence Engine actually treats a
 * case -- built from the same Badge tones/labels the real product uses
 * (ClaimsList: documented/undocumented/conflicting, ConflictWorkspace:
 * påstand A/B + clarifying question, DocumentationGapsList: recommended
 * document), so it reads as a true preview, not a generic marketing
 * graphic. Static content, honestly captioned as an example -- not live
 * data.
 */
export function EvidenceEngineShowcase() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13.5px] text-ink">
            Reisefradrag for 187 arbeidsdager mellom Asker og Oslo er ikke ført i skattemeldingen.
          </p>
          <Badge tone="success">Dokumentert</Badge>
        </div>
        <p className="mt-1.5 text-[12px] text-ink-faint">Funnet i «arbeidsavtale.pdf» — KI-tillit: høy</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <Badge tone="warning">Motstridende</Badge>
        <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
          <div className="flex-1 rounded-md border border-border bg-surface-alt p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Påstand A</p>
            <p className="mt-1 text-[13px] text-ink">Arbeidsforholdet startet 1. januar 2023.</p>
            <p className="mt-1 text-[11.5px] text-ink-faint">arbeidsavtale.pdf</p>
          </div>
          <div className="flex-1 rounded-md border border-border bg-surface-alt p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Påstand B</p>
            <p className="mt-1 text-[13px] text-ink">Arbeidsforholdet startet faktisk 1. juni 2023.</p>
            <p className="mt-1 text-[11.5px] text-ink-faint">arbeidsgiverbrev.pdf</p>
          </div>
        </div>
        <p className="mt-2.5 text-[12.5px] text-ink-soft">
          For å avklare: Hva er den offisielle, dokumenterte startdatoen for arbeidsforholdet?
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13.5px] text-ink">
            Mangler dokumentasjon på faktisk reisevei og antall reisedager.
          </p>
          <Badge tone="neutral">Dokumentasjonshull</Badge>
        </div>
        <p className="mt-1.5 text-[12px] font-medium text-primary-ink">
          Anbefalt dokument: Reiseoversikt eller arbeidsgivers timelister
        </p>
      </div>
    </div>
  );
}
