import { Badge } from "@/components/design-system";
import type { Report, SkatteendringReportContent } from "@/lib/reports/types";

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

export function SkatteendringProposalView({
  report,
  caseId,
}: {
  report: Report<SkatteendringReportContent>;
  caseId: string;
}) {
  const c = report.content;
  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Badge tone="info">Forslag til skatteendring</Badge>
        <a
          href={`/api/cases/${caseId}/reports/${report.id}/pdf`}
          className="rounded-md border border-border-strong bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:bg-surface-alt"
        >
          Last ned PDF
        </a>
      </div>

      <Section title="Henvendelse">
        <p className="whitespace-pre-line text-[13.5px] text-ink">{c.proposal_text}</p>
      </Section>

      <Section title="Begrunnelse">
        <p className="text-[13.5px] text-ink-soft">{c.reasoning}</p>
      </Section>

      <Section title="Grunnlagsdokumenter">
        <BulletList
          items={c.referenced_documents.map((d) => `${d.filename} — ${d.relevance}`)}
          empty="Ingen dokumenter referert ennå."
        />
      </Section>

      <Section title="Vedleggsliste">
        <BulletList items={c.attachments} empty="Ingen vedlegg foreslått ennå." />
      </Section>

      <Section title="Manglende opplysninger">
        <BulletList items={c.missing_information} empty="Ingen mangler identifisert." />
      </Section>

      <Section title="Relevant regelverk">
        <BulletList
          items={c.applicable_rules.map((r) => `${r.law_reference} ${r.provision} — ${r.short_explanation}`)}
          empty="Ingen regler vurdert som relevante ennå."
        />
      </Section>

      <p className="text-[12px] text-ink-faint">
        Dette er et utkast til gjennomsyn, ikke en juridisk konklusjon eller en garanti for utfall.
      </p>
    </div>
  );
}
