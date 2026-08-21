"use client";

import { useMemo, useState } from "react";
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
  uploaded_at: string;
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

type SortOrder = "date-desc" | "date-asc" | "name-asc" | "name-desc";

const sortLabels: Record<SortOrder, string> = {
  "date-desc": "Nyeste dato",
  "date-asc": "Eldste dato",
  "name-asc": "Navn A–Å",
  "name-desc": "Navn Å–A",
};

/** The date a row sorts by: the document's own content date when the AI
 * actually found one, falling back to when it was uploaded -- never a
 * blend of the two within one sort, so "nyeste dato" stays predictable. */
function sortDate(doc: DocumentInsightRow): string {
  return doc.ai_extraction?.document_date || doc.uploaded_at;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export function DocumentInsightList({ documents }: { documents: DocumentInsightRow[] }) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("date-desc");

  const sorted = useMemo(() => {
    const rows = [...documents];
    switch (sortOrder) {
      case "date-desc":
        return rows.sort((a, b) => sortDate(b).localeCompare(sortDate(a)));
      case "date-asc":
        return rows.sort((a, b) => sortDate(a).localeCompare(sortDate(b)));
      case "name-asc":
        return rows.sort((a, b) => a.original_filename.localeCompare(b.original_filename, "nb-NO"));
      case "name-desc":
        return rows.sort((a, b) => b.original_filename.localeCompare(a.original_filename, "nb-NO"));
    }
  }, [documents, sortOrder]);

  if (documents.length === 0) {
    return <p className="text-[13.5px] text-ink-soft">Ingen dokumenter lastet opp ennå.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {documents.length > 1 && (
        <label className="flex items-center gap-2 self-end text-[12.5px] font-medium text-ink-soft">
          Sorter
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] text-ink"
          >
            {(Object.keys(sortLabels) as SortOrder[]).map((order) => (
              <option key={order} value={order}>
                {sortLabels[order]}
              </option>
            ))}
          </select>
        </label>
      )}

      <ul className="flex flex-col gap-3">
        {sorted.map((doc) => {
          const badge = statusBadge[doc.extraction_status];
          const analysis = doc.case_analysis;
          const documentDate = doc.ai_extraction?.document_date;

          return (
            <li
              key={doc.id}
              id={`dokument-${doc.id}`}
              className="scroll-mt-24 rounded-md border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-ink">{doc.original_filename}</p>
                  <p className="mt-0.5 text-[12px] text-ink-faint">
                    {documentDate
                      ? `Dokumentdato: ${formatDate(documentDate)}`
                      : `Lastet opp ${formatDate(doc.uploaded_at)}`}
                  </p>
                </div>
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
    </div>
  );
}
