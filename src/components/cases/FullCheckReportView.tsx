import { Badge } from "@/components/design-system";
import type { Report } from "@/lib/reports/types";

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
  if (items.length === 0) {
    return <p className="text-[13px] text-ink-faint">{empty}</p>;
  }
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

export function FullCheckReportView({ report, caseId }: { report: Report; caseId: string }) {
  const c = report.content;
  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Badge tone="info">Full sjekk-rapport</Badge>
        <a
          href={`/api/cases/${caseId}/reports/${report.id}/pdf`}
          className="rounded-md border border-border-strong bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:bg-surface-alt"
        >
          Last ned PDF
        </a>
      </div>

      <Section title="Sammendrag">
        <p className="text-[13.5px] text-ink">{c.summary}</p>
      </Section>

      <Section title="Bakgrunn">
        <p className="text-[13.5px] text-ink-soft">{c.background}</p>
      </Section>

      <Section title="Dokumenterte fakta">
        <BulletList items={c.documented_facts.map((f) => f.statement)} empty="Ingen ennå." />
      </Section>

      <Section title="Usikre eller udokumenterte forhold">
        <BulletList items={c.uncertain_or_missing.map((f) => f.statement)} empty="Ingen." />
      </Section>

      <Section title="Motstridende opplysninger">
        <BulletList items={c.conflicting_information} empty="Ingen motstridende opplysninger identifisert." />
      </Section>

      <Section title="Tidslinje">
        <BulletList items={c.timeline.map((t) => `${t.date} — ${t.label}`)} empty="Ingen daterte dokumenter ennå." />
      </Section>

      <div className="grid gap-6 sm:grid-cols-2">
        <Section title="Parter">
          <BulletList items={c.parties} empty="Ingen identifisert ennå." />
        </Section>
        <Section title="Beløp">
          <BulletList items={c.amounts.map((a) => `${a.label}: ${a.amount_kr} kr`)} empty="Ingen identifisert ennå." />
        </Section>
      </div>

      <Section title="Relevant regelverk">
        <BulletList
          items={c.applicable_rules.map((r) => `${r.law_reference} ${r.provision} — ${r.short_explanation}`)}
          empty="Ingen regler vurdert som relevante ennå."
        />
      </Section>

      <Section title="Vurdering">
        <p className="text-[13.5px] text-ink-soft">{c.assessment}</p>
      </Section>

      <Section title="Dokumentasjonshull">
        <BulletList items={c.documentation_gaps} empty="Ingen hull identifisert." />
      </Section>

      <Section title="Anbefalte neste steg">
        <BulletList items={c.recommended_next_steps} empty="Ingen anbefalinger ennå." />
      </Section>

      <p className="text-[12px] text-ink-faint">
        Dette er en KI-støttet vurdering, ikke en juridisk konklusjon.
      </p>
    </div>
  );
}
