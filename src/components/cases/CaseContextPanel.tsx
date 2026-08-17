import Link from "next/link";
import { Badge } from "@/components/design-system";
import { stageLabels, stageOrder, statusLabels, statusTones } from "@/lib/cases/labels";
import type { Case } from "@/lib/cases/types";

const nextStepCopy: Record<string, { label: string; cta: string }> = {
  "enkel-sjekk": {
    label: "Fullfør den enkle sjekken for å se om saken egner seg for Full sjekk.",
    cta: "Fortsett enkel sjekk",
  },
  "full-sjekk": {
    label: "Bygg den fulle rapporten med dokumentasjon og regelverk.",
    cta: "Fortsett full sjekk",
  },
  skatteendring: {
    label: "Formuler henvendelsen til Skatteetaten basert på rapporten.",
    cta: "Fortsett skatteendring",
  },
  utredning: {
    label: "Samle alt grunnlaget til en utvidet utredning.",
    cta: "Fortsett utredning",
  },
};

export function CaseContextPanel({ caseData, activeStage }: { caseData: Case; activeStage: string }) {
  const activeIndex = stageOrder.indexOf(activeStage as (typeof stageOrder)[number]);
  const next = nextStepCopy[activeStage];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[280px]">
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Saksgang
        </p>
        <ol className="mt-3 flex flex-col gap-2.5">
          {stageOrder.map((stage, i) => {
            const done = i < activeIndex;
            const current = i === activeIndex;
            return (
              <li key={stage} className="flex items-center gap-2.5">
                <span
                  className={
                    current
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white"
                      : done
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] font-semibold text-white"
                        : "flex h-5 w-5 items-center justify-center rounded-full bg-neutral-subtle text-[10px] font-semibold text-ink-faint"
                  }
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={
                    current
                      ? "text-[13px] font-semibold text-ink"
                      : "text-[13px] text-ink-soft"
                  }
                >
                  {stageLabels[stage]}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Dokumentasjon
        </p>
        <p className="mt-3 text-[13px] text-ink-soft">
          Ingen dokumenter lastet opp ennå.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Status
        </p>
        <div className="mt-3">
          <Badge tone={statusTones[caseData.status]}>
            {statusLabels[caseData.status]}
          </Badge>
        </div>
      </section>

      {next && (
        <section className="rounded-lg border border-primary bg-primary-subtle p-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-primary-ink">
            Neste steg
          </p>
          <p className="mt-2 text-[13px] text-primary-ink">{next.label}</p>
          <Link
            href={`/min-side/saker/${caseData.id}?steg=${activeStage}`}
            className="mt-3 inline-flex rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-ink"
          >
            {next.cta}
          </Link>
        </section>
      )}
    </aside>
  );
}
