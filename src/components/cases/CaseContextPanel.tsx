import Link from "next/link";
import { Badge } from "@/components/design-system";
import { NextActionCard, type OtherOpenItem } from "./NextActionCard";
import { nextActionCta } from "@/lib/cases/nextActionCta";
import { stageLabels, stageOrder, statusLabels, statusTones } from "@/lib/cases/labels";
import type { Case } from "@/lib/cases/types";
import type { Product } from "@/lib/products/types";

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
  "komplett-sak": {
    label: "Bygg en dypere analyse med kronologi, konfliktdeteksjon og komplett saksmappe.",
    cta: "Fortsett komplett sak",
  },
  "strategisk-utredning": {
    label: "Den mest avanserte analysen -- på tvers av dokumenter, år og regelverk.",
    cta: "Fortsett strategisk utredning",
  },
};

export function CaseContextPanel({
  caseData,
  activeStage,
  entitlement,
  singleOpenGapId,
  otherOpenItems,
}: {
  caseData: Case;
  activeStage: string;
  entitlement: Product | null;
  singleOpenGapId?: string;
  otherOpenItems: OtherOpenItem[];
}) {
  const activeIndex = stageOrder.indexOf(activeStage as (typeof stageOrder)[number]);
  const next = nextStepCopy[activeStage];

  // "Neste steg" is a generic, stage-based nudge ("fortsett full sjekk");
  // Neste anbefalte handling is the case-specific one. They only actually
  // duplicate each other when the AI's own recommendation is itself "go
  // upgrade/generate the report for this stage" -- nextActionCta.ts sends
  // both of those action types to the exact same href as "Neste steg", so
  // showing both would just be the same link twice under two headings.
  const nextActionHref = caseData.next_action_type
    ? nextActionCta(caseData.next_action_type, caseData.id, caseData.stage, singleOpenGapId)?.href
    : null;
  const nextStepHref = next ? `/min-side/saker/${caseData.id}?steg=${activeStage}` : null;
  const nextStepDuplicatesNextAction = Boolean(caseData.next_action && nextActionHref === nextStepHref);

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

      <NextActionCard
        caseId={caseData.id}
        stage={caseData.stage}
        action={caseData.next_action}
        reasoning={caseData.next_action_reasoning}
        actionType={caseData.next_action_type}
        singleOpenGapId={singleOpenGapId}
        otherOpenItems={otherOpenItems}
      />

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Status
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={statusTones[caseData.status]}>
            {statusLabels[caseData.status]}
          </Badge>
          <Badge tone="info">{entitlement ? entitlement.name : "Enkel sjekk (gratis)"}</Badge>
        </div>
      </section>

      {next && !nextStepDuplicatesNextAction && (
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
