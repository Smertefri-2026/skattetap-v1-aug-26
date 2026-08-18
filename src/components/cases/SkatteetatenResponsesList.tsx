import { Badge } from "@/components/design-system";
import type { ResponseInterpretation } from "@/lib/ai/skatteetatenResponseInterpretation";

interface ResponseRow {
  id: string;
  interpretation: ResponseInterpretation;
  created_at: string;
}

const outcomeBadge: Record<
  string,
  { tone: "success" | "warning" | "danger" | "neutral"; label: string }
> = {
  medhold: { tone: "success", label: "Medhold" },
  delvis_medhold: { tone: "warning", label: "Delvis medhold" },
  avslag: { tone: "danger", label: "Avslag" },
  trukket_avsluttet: { tone: "neutral", label: "Trukket/avsluttet" },
  ukjent: { tone: "neutral", label: "Utfall uklart" },
};

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item} className="text-[13px] text-ink-soft">
          • {item}
        </li>
      ))}
    </ul>
  );
}

export function SkatteetatenResponsesList({ responses }: { responses: ResponseRow[] }) {
  if (responses.length === 0) {
    return (
      <p className="text-[13.5px] text-ink-soft">
        Ingen svar fra Skatteetaten er lastet opp ennå.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {responses.map((r) => {
        const badge = outcomeBadge[r.interpretation.detected_outcome] ?? outcomeBadge.ukjent;
        return (
          <div key={r.id} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink-faint">
                {new Date(r.created_at).toLocaleDateString("no-NO")}
              </span>
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>
            <p className="mt-3 text-[13.5px] text-ink">{r.interpretation.summary_plain_language}</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Dokumenterte forhold
                </p>
                <BulletList items={r.interpretation.documented_findings} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Rettslige vurderinger
                </p>
                <BulletList items={r.interpretation.legal_assessments} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Antakelser
                </p>
                <BulletList items={r.interpretation.assumptions} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Ikke besvart
                </p>
                <BulletList items={r.interpretation.unanswered_points} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Nye dokumentasjonsbehov
                </p>
                <BulletList items={r.interpretation.new_documentation_needs} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Forslag til neste steg
                </p>
                <BulletList items={r.interpretation.suggested_next_steps} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
