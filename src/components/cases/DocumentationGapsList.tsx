"use client";

import { Badge, Button } from "@/components/design-system";
import { reopenDocumentationGap, resolveDocumentationGap } from "@/lib/documentationGaps/actions";

export interface DocumentationGapRow {
  id: string;
  description: string;
  suggested_action: string;
  status: "open" | "resolved";
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
        <div
          key={gap.id}
          className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface p-4"
        >
          <div className="flex-1">
            <Badge tone="warning">Åpent</Badge>
            <p className="mt-2 text-[13.5px] text-ink">{gap.description}</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">Forslag: {gap.suggested_action}</p>
          </div>
          <form action={resolveDocumentationGap.bind(null, caseId)}>
            <input type="hidden" name="gapId" value={gap.id} />
            <Button type="submit" variant="secondary">
              Merk som løst
            </Button>
          </form>
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
