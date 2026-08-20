"use client";

import { Badge, Button } from "@/components/design-system";
import { reopenDocumentationGap, resolveDocumentationGap } from "@/lib/documentationGaps/actions";
import { DocumentUploadForm } from "./DocumentUploadForm";

export interface DocumentationGapRow {
  id: string;
  description: string;
  suggested_action: string;
  status: "open" | "resolved";
  importance: string | null;
  recommended_document: string | null;
  affected_claim_statement: string | null;
}

export function DocumentationGapsList({
  caseId,
  gaps,
}: {
  caseId: string;
  gaps: DocumentationGapRow[];
}) {
  if (gaps.length === 0) {
    return (
      <p className="text-[13.5px] text-ink-soft">
        Ingen dokumentasjonshull registrert ennå. Bygg en analyse for å identifisere dem.
      </p>
    );
  }

  const open = gaps.filter((g) => g.status === "open");
  const resolved = gaps.filter((g) => g.status === "resolved");

  return (
    <div className="flex flex-col gap-3">
      {open.map((gap) => (
        <div key={gap.id} className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Badge tone="warning">Åpent</Badge>
              <p className="mt-2 text-[13.5px] font-medium text-ink">{gap.description}</p>
              {gap.importance && (
                <p className="mt-1 text-[12.5px] text-ink-soft">Hvorfor det er viktig: {gap.importance}</p>
              )}
              {gap.affected_claim_statement && (
                <p className="mt-1 text-[12.5px] text-ink-faint">
                  Gjelder: {gap.affected_claim_statement}
                </p>
              )}
              {gap.recommended_document && (
                <p className="mt-1.5 text-[12.5px] font-medium text-primary-ink">
                  Anbefalt dokument: {gap.recommended_document}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <DocumentUploadForm caseId={caseId} />
            <form action={resolveDocumentationGap.bind(null, caseId)}>
              <input type="hidden" name="gapId" value={gap.id} />
              <Button type="submit" variant="secondary">
                Merk som løst
              </Button>
            </form>
          </div>
        </div>
      ))}

      {resolved.length > 0 && (
        <details className="rounded-md border border-border bg-surface-alt p-4">
          <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-soft">
            {resolved.length} løste hull
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {resolved.map((gap) => (
              <div key={gap.id} className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Badge tone="success">Løst</Badge>
                  <p className="mt-1.5 text-[13px] text-ink-soft line-through decoration-border-strong">
                    {gap.description}
                  </p>
                </div>
                <form action={reopenDocumentationGap.bind(null, caseId)}>
                  <input type="hidden" name="gapId" value={gap.id} />
                  <Button type="submit" variant="ghost">
                    Gjenåpne
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
