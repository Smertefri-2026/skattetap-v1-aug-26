import { Badge } from "@/components/design-system";
import type { BadgeTone } from "@/components/design-system";
import type { Report, StrategiskUtredningReportContent } from "@/lib/reports/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-[13px] text-ink-faint">{empty}</p>;
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item} className="text-[13.5px] text-ink-soft">
          • {item}
        </li>
      ))}
    </ul>
  );
}

const patternTypeTone: Record<string, BadgeTone> = {
  gjentakende_fradrag: "info",
  gjentakende_konflikt: "warning",
  gjentakende_mangel: "warning",
  annet: "neutral",
};

const patternTypeLabel: Record<string, string> = {
  gjentakende_fradrag: "Gjentakende fradrag",
  gjentakende_konflikt: "Gjentakende konflikt",
  gjentakende_mangel: "Gjentakende mangel",
  annet: "Mønster",
};

export function StrategiskUtredningReportView({
  report,
  caseId,
}: {
  report: Report<StrategiskUtredningReportContent>;
  caseId: string;
}) {
  const c = report.content;
  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Badge tone="info">Strategisk utredning</Badge>
        <div className="flex gap-2">
          <a
            href={`/api/cases/${caseId}/reports/${report.id}/json`}
            className="rounded-md border border-border-strong bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:bg-surface-alt"
          >
            Last ned JSON
          </a>
          <a
            href={`/api/cases/${caseId}/reports/${report.id}/pdf`}
            className="rounded-md border border-border-strong bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:bg-surface-alt"
          >
            Last ned PDF
          </a>
        </div>
      </div>

      <Section title={`Saker inkludert (${c.included_cases.length})`}>
        <ul className="flex flex-wrap gap-2">
          {c.included_cases.map((included) => (
            <Badge key={included.case_id} tone={included.is_primary ? "info" : "neutral"}>
              {included.title}
              {included.is_primary ? " (denne saken)" : ""}
            </Badge>
          ))}
        </ul>
      </Section>

      {c.included_cases.length <= 1 && (
        <div className="rounded-md border border-warning bg-warning-subtle p-4">
          <p className="text-[13px] font-medium text-warning-ink">
            Denne utredningen bygger kun på denne ene saken.
          </p>
          <p className="mt-1 text-[12.5px] text-warning-ink">
            Mønstre og sammenligninger under har begrenset grunnlag når det ikke finnes andre
            saker å sammenligne med. Fristvurdering, økonomisk eksponering og strategier for
            denne ene saken er fortsatt fullverdige.
          </p>
        </div>
      )}

      <Section title="Dine egne opplysninger">
        <BulletList
          items={c.user_explanations.map((u) => `${u.case_title}: ${u.explanation}`)}
          empty="Ingen egne opplysninger registrert."
        />
      </Section>

      <Section title="Dokumenterte fakta per sak">
        <BulletList
          items={c.documented_facts_overview.flatMap((d) => d.facts.map((f) => `${d.case_title}: ${f}`))}
          empty="Ingen dokumenterte fakta registrert ennå."
        />
      </Section>

      <Section title="Dokumentasjonshull per sak">
        <BulletList
          items={c.documentation_gaps_overview.flatMap((d) => d.gaps.map((g) => `${d.case_title}: ${g}`))}
          empty="Ingen hull registrert."
        />
      </Section>

      <Section title="Mønstre og gjentatte feil på tvers av saker og år">
        {c.patterns.length === 0 ? (
          <p className="text-[13px] text-ink-faint">Ingen gjentakende mønstre identifisert.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {c.patterns.map((p) => (
              <div key={p.description} className="rounded-md border border-border p-3">
                <Badge tone={patternTypeTone[p.pattern_type] ?? "neutral"}>
                  {patternTypeLabel[p.pattern_type] ?? p.pattern_type}
                </Badge>
                <p className="mt-1.5 text-[13px] text-ink-soft">{p.description}</p>
                <p className="mt-1 text-[12px] text-ink-faint">Gjelder: {p.case_titles.join(", ")}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Sammenligninger">
        <BulletList
          items={c.comparisons.map((cmp) => `[${cmp.dimension}] ${cmp.description} (${cmp.case_titles.join(", ")})`)}
          empty="Ingen sammenligninger gjort."
        />
      </Section>

      <Section title="Fristvurdering per sak">
        {c.deadlines.length === 0 ? (
          <p className="text-[13px] text-ink-faint">Ingen saker å vurdere frist for.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {c.deadlines.map((d) => (
              <li key={d.case_title} className="flex items-start gap-2.5">
                <Badge tone={d.status === "vurdert" ? "warning" : "neutral"}>
                  {d.status === "vurdert" ? "Frist vurdert" : "Ikke vurdert"}
                </Badge>
                <span className="text-[13px] text-ink-soft">
                  {d.case_title}:{" "}
                  {d.status === "vurdert"
                    ? `${d.deadline_date} (${d.deadline_type}, kilde: ${d.source})`
                    : d.note}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Samlet økonomisk eksponering">
        <div className="rounded-md bg-primary-subtle p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-ink">Samlet</p>
          <p className="mt-0.5 text-[22px] font-semibold text-ink">
            {c.financial_exposure.total_amount_kr.toLocaleString("no-NO")} kr
          </p>
        </div>
        <div className="mt-3">
          <BulletList
            items={c.financial_exposure.breakdown_by_case.map(
              (b) => `${b.case_title}: ${b.amount_kr.toLocaleString("no-NO")} kr`
            )}
            empty="Ingen beløp identifisert."
          />
        </div>
      </Section>

      <Section title="Berørt regelverk">
        <BulletList
          items={c.applicable_rules.map((r) => `${r.law_reference} ${r.provision} — ${r.short_explanation}`)}
          empty="Ingen regler identifisert som relevante ennå."
        />
      </Section>

      <Section title="Alternative strategier">
        {c.strategies.length === 0 ? (
          <p className="text-[13px] text-ink-faint">Ingen strategier identifisert ennå.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {c.strategies.map((s) => (
              <div key={s.name} className="rounded-md border border-border bg-surface-alt p-4">
                <p className="text-[14px] font-semibold text-ink">{s.name}</p>
                <p className="mt-1 text-[13px] text-ink-soft">{s.description}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-success-ink">Styrker</p>
                    <BulletList items={s.strengths} empty="Ingen registrert." />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-danger-ink">Svakheter</p>
                    <BulletList items={s.weaknesses} empty="Ingen registrert." />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-warning-ink">Risiko</p>
                    <BulletList items={s.risks} empty="Ingen registrert." />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Konsekvenser</p>
                    <BulletList items={s.consequences} empty="Ingen registrert." />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Samlet strategisk vurdering">
        <p className="text-[13.5px] text-ink-soft">{c.overall_assessment}</p>
      </Section>

      <Section title="Prioriterte saker">
        {c.prioritized_cases.length === 0 ? (
          <p className="text-[13px] text-ink-faint">Ingen prioritering gjort ennå.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {c.prioritized_cases.map((p, i) => (
              <li key={p.case_title} className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                  {i + 1}
                </span>
                <span className="text-[13px] text-ink-soft">
                  <span className="font-medium text-ink">{p.case_title}</span> — {p.reasoning}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Antakelser denne utredningen bygger på">
        <BulletList items={c.assumptions} empty="Ingen eksplisitte antakelser registrert." />
      </Section>

      <Section title="Anbefalte neste steg">
        <BulletList items={c.recommended_next_steps} empty="Ingen anbefalinger ennå." />
      </Section>

      <p className="text-[12px] text-ink-faint">
        Dette er en KI-støttet strategisk analyse, ikke en juridisk konklusjon eller en garanti for utfall.
      </p>
    </div>
  );
}
