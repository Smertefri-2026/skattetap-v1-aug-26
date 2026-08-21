"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/design-system";

type BadgeTone = "info" | "success" | "danger" | "neutral";

const statusBadge: Record<string, { tone: BadgeTone; label: string }> = {
  pending: { tone: "neutral", label: "Venter" },
  extracting: { tone: "info", label: "Analyserer" },
  done: { tone: "success", label: "Analysert" },
  failed: { tone: "danger", label: "Feilet" },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export type DocumentRow = {
  id: string;
  original_filename: string;
  extraction_status: string;
  case_id: string;
  uploaded_at: string;
  caseTitle: string;
};

export function DocumentList({ documents, cases }: { documents: DocumentRow[]; cases: { id: string; title: string }[] }) {
  const [caseFilter, setCaseFilter] = useState<string>("alle");

  const filtered = useMemo(() => {
    if (caseFilter === "alle") return documents;
    return documents.filter((d) => d.case_id === caseFilter);
  }, [documents, caseFilter]);

  return (
    <div className="flex flex-col gap-4">
      {cases.length > 1 && (
        <label className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
          Filtrer på sak
          <select
            value={caseFilter}
            onChange={(e) => setCaseFilter(e.target.value)}
            className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-[13.5px] text-ink"
          >
            <option value="alle">Alle saker</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-alt p-8 text-center">
          <p className="text-[14.5px] text-ink-soft">Ingen dokumenter matcher filteret.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((doc) => {
            const badge = statusBadge[doc.extraction_status] ?? statusBadge.pending;
            return (
              <li key={doc.id}>
                <Link
                  href={`/min-side/saker/${doc.case_id}?steg=full-sjekk`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm hover:border-border-strong"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{doc.original_filename}</p>
                    <p className="mt-1 text-[12.5px] text-ink-faint">
                      {doc.caseTitle} · {formatDate(doc.uploaded_at)}
                    </p>
                  </div>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
