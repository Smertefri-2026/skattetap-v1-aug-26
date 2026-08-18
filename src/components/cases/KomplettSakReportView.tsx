import { Badge } from "@/components/design-system";
import type { ChangesSinceLast, Report, KomplettSakReportContent } from "@/lib/reports/types";

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

function ChangesSinceLastSection({ changes }: { changes: ChangesSinceLast }) {
  if (!changes.has_previous) {
    return (
      <div className="rounded-md bg-surface-alt p-4">
        <p className="text-[13px] text-ink-soft">Dette er den første analysen av saken.</p>
      </div>
    );
  }

  const rows: { label: string; items: string[] }[] = [
    { label: "Nye dokumenter", items: changes.new_documents },
    { label: "Nye dokumentasjonshull", items: changes.new_gaps },
    { label: "Løste dokumentasjonshull", items: changes.resolved_gaps },
    { label: "Nye konflikter oppdaget", items: changes.new_conflicts },
    { label: "Endrede vurderinger", items: changes.changed_assessments },
  ].filter((row) => row.items.length > 0);

  return (
    <div className="rounded-md border border-primary bg-primary-subtle p-4">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-primary-ink">
        Nytt siden forrige analyse
      </p>
      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-primary-ink">
          Ingen endringer siden forrige analyse -- saken er analysert på nytt likevel.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.label}>
              <p className="text-[12.5px] font-semibold text-primary-ink">{row.label}</p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {row.items.map((item) => (
                  <li key={item} className="text-[13px] text-primary-ink">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const sourceTone = { documented: "success", user_explanation: "neutral", ai_inference: "info" } as const;
const sourceLabel = { documented: "Dokumentert", user_explanation: "Brukerens forklaring", ai_inference: "KI-utledning" } as const;
const strengthTone = { strong: "success", weak: "neutral", conflicting: "warning" } as const;
const strengthLabel = { strong: "Sterkt", weak: "Svakt", conflicting: "Motstridende" } as const;
const severityTone = { high: "danger", medium: "warning", low: "neutral" } as const;

export function KomplettSakReportView({
  report,
  caseId,
}: {
  report: Report<KomplettSakReportContent>;
  caseId: string;
}) {
  const c = report.content;
  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Badge tone="info">Komplett saksmappe</Badge>
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

      <ChangesSinceLastSection changes={c.changes_since_last} />

      <Section title="Sammendrag">
        <p className="text-[13.5px] text-ink">{c.case_summary}</p>
      </Section>

      {c.user_explanation && (
        <Section title="Brukerens forklaring">
          <p className="text-[13.5px] text-ink-soft">{c.user_explanation}</p>
        </Section>
      )}

      <Section title="Kronologi">
        {c.chronology.length === 0 ? (
          <p className="text-[13px] text-ink-faint">Ingen hendelser identifisert ennå.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {c.chronology.map((entry) => (
              <li key={`${entry.date}-${entry.description}`} className="flex items-start gap-2.5">
                <Badge tone={sourceTone[entry.source_type]}>{sourceLabel[entry.source_type]}</Badge>
                <span className="text-[13px] text-ink-soft">
                  {entry.date ?? "Udatert"} — {entry.description}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Faktastyrke">
        {c.fact_strength.length === 0 ? (
          <p className="text-[13px] text-ink-faint">Ingen fakta vurdert ennå.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {c.fact_strength.map((f) => (
              <li key={f.statement} className="flex items-start gap-2.5">
                <Badge tone={strengthTone[f.strength]}>{strengthLabel[f.strength]}</Badge>
                <span className="text-[13px] text-ink-soft">
                  {f.statement} — {f.reasoning}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Motstridende opplysninger">
        {c.conflicts.length === 0 ? (
          <p className="text-[13px] text-ink-faint">Ingen motsigelser identifisert.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {c.conflicts.map((conflict) => (
              <li key={conflict.description} className="flex items-start gap-2.5">
                <Badge tone={severityTone[conflict.severity]}>{conflict.severity}</Badge>
                <span className="text-[13px] text-ink-soft">
                  {conflict.description} ({conflict.statements.join("; ")})
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Dokumentasjonshull og forslag">
        <BulletList
          items={c.documentation_gaps.map((g) => `${g.description} — Forslag: ${g.suggested_action}`)}
          empty="Ingen hull identifisert."
        />
      </Section>

      <Section title="Beløp og økonomisk konsekvens">
        <p className="text-[13.5px] font-semibold text-ink">
          {c.financial_summary.total_amount_kr.toLocaleString("no-NO")} kr samlet identifisert
        </p>
        <div className="mt-2">
          <BulletList
            items={c.financial_summary.breakdown.map((a) => `${a.label}: ${a.amount_kr} kr`)}
            empty="Ingen fordeling tilgjengelig."
          />
        </div>
        <p className="mt-2 text-[13px] text-ink-soft">{c.financial_summary.impact_note}</p>
      </Section>

      <Section title="Kobling mellom fakta og regelverk">
        {c.claim_rule_links.length === 0 ? (
          <p className="text-[13px] text-ink-faint">Ingen kobling gjort ennå.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {c.claim_rule_links.map((l) => (
              <li key={l.statement} className="text-[13px] text-ink-soft">
                {l.statement} →{" "}
                {l.rules.length
                  ? l.rules.map((r) => `${r.law_reference} ${r.provision}`).join(", ")
                  : "ingen regel koblet"}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {c.skatteetaten_context && (
        <Section title="Tidligere svar fra Skatteetaten">
          <p className="text-[13.5px] text-ink-soft">{c.skatteetaten_context}</p>
        </Section>
      )}

      <Section title="Alternative forklaringer/utfall">
        {c.alternative_scenarios.length === 0 ? (
          <p className="text-[13px] text-ink-faint">
            Saken vurderes som entydig — ingen alternative tolkninger identifisert.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {c.alternative_scenarios.map((s) => (
              <li key={s.scenario} className="text-[13.5px] text-ink-soft">
                <span className="font-medium text-ink">{s.scenario}</span> — {s.note}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-6 sm:grid-cols-2">
        <Section title="Sterkeste punkter">
          <BulletList items={c.strongest_points} empty="Ingen registrert." />
        </Section>
        <Section title="Svakeste punkter">
          <BulletList items={c.weakest_points} empty="Ingen registrert." />
        </Section>
      </div>

      <Section title="Skatterettslig vurdering">
        <p className="text-[13.5px] text-ink-soft">{c.legal_assessment}</p>
      </Section>

      <Section title="KI-vurdering (generell syntese)">
        <p className="text-[13.5px] text-ink-soft">{c.ai_assessment}</p>
      </Section>

      <Section title="Anbefalte neste steg">
        <BulletList items={c.recommended_next_steps} empty="Ingen anbefalinger ennå." />
      </Section>

      <p className="text-[12px] text-ink-faint">
        Dette er en KI-støttet analyse, ikke en juridisk konklusjon eller en garanti for utfall.
      </p>
    </div>
  );
}
