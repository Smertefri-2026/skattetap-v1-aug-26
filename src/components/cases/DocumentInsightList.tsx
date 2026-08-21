"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/design-system";
import type { BadgeTone } from "@/components/design-system";
import { retryDocumentAnalysis } from "@/lib/documents/retryAnalysis";
import { OpenDocumentButton } from "./OpenDocumentButton";

export interface DocumentInsightRow {
  id: string;
  original_filename: string;
  extraction_status: "pending" | "extracting" | "done" | "failed";
  rejection_reason: string | null;
  extracted_text: string | null;
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

const TEXT_UNREADABLE_MESSAGE =
  "Vi klarte ikke å hente ut nok tekst fra dokumentet til å analysere det. Prøv en annen PDF-versjon eller last opp dokumentet på nytt.";
const ANALYSIS_FAILED_FALLBACK_MESSAGE = "Vi klarte ikke å analysere dokumentet. Du kan prøve analysen på nytt.";

/**
 * Which of the two failure modes this is -- and so what heading to show --
 * is read off extracted_text, not a status column: text extraction never
 * populates it, while an AI-analysis or claim-persistence failure always
 * does (analyzeAndPersist.ts sets it before either of those can fail). No
 * document is ever shown as analysed when it wasn't; a rejection_reason
 * without an extracted_text always means the text itself couldn't be read.
 */
function FailureNotice({ doc, caseId }: { doc: DocumentInsightRow; caseId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isTextReadable = Boolean(doc.extracted_text);
  const heading = isTextReadable ? "Analysen mislyktes" : "Dokumentet kunne ikke leses";
  const body = isTextReadable
    ? (doc.rejection_reason ?? ANALYSIS_FAILED_FALLBACK_MESSAGE)
    : TEXT_UNREADABLE_MESSAGE;
  const technicalDetail =
    !isTextReadable && doc.rejection_reason && doc.rejection_reason !== body ? doc.rejection_reason : null;

  function handleRetry() {
    setError(null);
    startTransition(async () => {
      try {
        await retryDocumentAnalysis(caseId, doc.id);
      } catch {
        setError("Kunne ikke starte analysen på nytt. Prøv igjen.");
      }
    });
  }

  return (
    <div className="mt-2.5 rounded-md border border-danger bg-danger-subtle p-3">
      <p className="text-[13px] font-semibold text-danger-ink">{heading}</p>
      <p className="mt-1 text-[12.5px] text-danger-ink">{body}</p>
      {technicalDetail && <p className="mt-1 text-[11.5px] text-ink-faint">{technicalDetail}</p>}
      <Button type="button" variant="secondary" disabled={isPending} onClick={handleRetry} className="mt-2.5">
        {isPending ? "Prøver på nytt..." : "Prøv analyse på nytt"}
      </Button>
      {error && <p className="mt-1.5 text-[12px] text-danger-ink">{error}</p>}
    </div>
  );
}

export function DocumentInsightList({ documents, caseId }: { documents: DocumentInsightRow[]; caseId: string }) {
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

              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <OpenDocumentButton caseId={caseId} documentId={doc.id} label="Åpne dokument" />
                <Link
                  href={`/min-side/saker/${caseId}?steg=saksbilde&dokument=${encodeURIComponent(doc.original_filename)}#saksbehandler`}
                  className="text-[12.5px] font-medium text-primary-ink hover:underline"
                >
                  Spør om dette dokumentet
                </Link>
              </div>

              {doc.extraction_status === "failed" && <FailureNotice doc={doc} caseId={caseId} />}

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
