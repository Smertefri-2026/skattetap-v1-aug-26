import { Badge } from "@/components/design-system";
import type { BadgeTone } from "@/components/design-system";

export interface DocumentMapEntry {
  id: string;
  fileName: string;
  credibility: "high" | "medium" | "low" | null;
  factCount: number;
  conflictCount: number;
  gapCount: number;
}

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

/**
 * How each document connects to the rest of the case -- fact/conflict/gap
 * counts computed live from claims, case_conflicts and documentation_gaps
 * (source_document_id), the same tables Levende saksbilde reads. No new
 * relationship data, just document-centric counts of what already exists.
 */
export function DocumentMap({ documents }: { documents: DocumentMapEntry[] }) {
  if (documents.length === 0) {
    return <p className="text-[13.5px] text-ink-soft">Ingen dokumenter lastet opp ennå.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <div key={doc.id} className="rounded-md border border-border bg-surface p-4">
          <p className="truncate text-[13.5px] font-medium text-ink" title={doc.fileName}>
            {doc.fileName}
          </p>
          {doc.credibility && (
            <div className="mt-1.5">
              <Badge tone={credibilityTone[doc.credibility]}>{credibilityLabel[doc.credibility]}</Badge>
            </div>
          )}
          <div className="mt-3 flex gap-4">
            <div>
              <p className="text-[16px] font-semibold text-ink">{doc.factCount}</p>
              <p className="text-[11px] text-ink-soft">fakta</p>
            </div>
            <div>
              <p className={`text-[16px] font-semibold ${doc.conflictCount > 0 ? "text-warning-ink" : "text-ink"}`}>
                {doc.conflictCount}
              </p>
              <p className="text-[11px] text-ink-soft">konflikter</p>
            </div>
            <div>
              <p className={`text-[16px] font-semibold ${doc.gapCount > 0 ? "text-warning-ink" : "text-ink"}`}>
                {doc.gapCount}
              </p>
              <p className="text-[11px] text-ink-soft">hull</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
