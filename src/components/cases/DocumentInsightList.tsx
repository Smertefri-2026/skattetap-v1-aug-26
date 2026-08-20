import { Badge } from "@/components/design-system";
import type { BadgeTone } from "@/components/design-system";

export interface DocumentInsightRow {
  id: string;
  original_filename: string;
  extraction_status: "pending" | "extracting" | "done" | "failed";
  rejection_reason: string | null;
  ai_extraction: { document_type?: string; document_date?: string | null } | null;
  case_analysis: {
    key_points?: string[];
    credibility?: "high" | "medium" | "low";
    credibility_reasoning?: string;
    document_gaps?: {
      description: string;
      importance: string;
      recommended_document: string | null;
    }[];
    recommended_next_documents?: string[];
  } | null;
}

const statusBadge: Record<
  DocumentInsightRow["extraction_status"],
  { tone: BadgeTone; label: string }
> = {
  pending: { tone: "neutral", label: "Venter" },
  extracting: { tone: "info", label: "Analyserer" },
  done: { tone: "success", label: "Analysert" },
  failed: { tone: "danger", label: "Feilet" },
};

const credibilityTone: Record<"high" | "medium" | "low", BadgeTone> = {
  high: "success",
  medium: "warning",
  low: "danger",
};

const credibilityLabel: Record<"high" | "medium" | "low", string> = {
  high: "Høy troverdighet",
  medium: "Middels troverdighet",
  low: "Lav troverdighet",
};

export function DocumentInsightList({ documents }: { documents: DocumentInsightRow[] }) {
  if (documents.length === 0) {
    return <p className="text-[13.5px] text-ink-soft">Ingen dokumenter lastet opp ennå.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {documents.map((doc) => {
        const badge = statusBadge[doc.extraction_status];
        const analysis = doc.case_analysis;

        return (
          <li key={doc.id} className="rounded-md border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13.5px] font-medium text-ink">{doc.original_filename}</p>
              <div className="flex items-center gap-2">
                {analysis?.credibility && (
                  <Badge tone={credibilityTone[analysis.credibility]}>
                    {credibilityLabel[analysis.credibility]}
                  </Badge>
                )}
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </div>
            </div>

            {doc.rejection_reason && (
              <p className="mt-1.5 text-[12px] text-ink-faint">{doc.rejection_reason}</p>
            )}

            {analysis?.key_points && analysis.key_points.length > 0 && (
              <ul className="mt-2.5 flex flex-col gap-1">
                {analysis.key_points.map((point, i) => (
                  <li key={i} className="text-[12.5px] text-ink-soft">
                    • {point}
                  </li>
                ))}
              </ul>
            )}

            {analysis?.document_gaps && analysis.document_gaps.length > 0 && (
              <div className="mt-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-warning-ink">
                  Mangler ved dette dokumentet
                </p>
                <ul className="mt-1 flex flex-col gap-1.5">
                  {analysis.document_gaps.map((gap, i) => (
                    <li key={i} className="text-[12.5px] text-ink-soft">
                      • {gap.description}
                      <span className="block text-[12px] text-ink-faint">{gap.importance}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis?.recommended_next_documents && analysis.recommended_next_documents.length > 0 && (
              <div className="mt-2.5 rounded-md bg-primary-subtle p-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-ink">
                  Dette ville styrket saken
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {analysis.recommended_next_documents.map((rec, i) => (
                    <li key={i} className="text-[12.5px] text-primary-ink">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
