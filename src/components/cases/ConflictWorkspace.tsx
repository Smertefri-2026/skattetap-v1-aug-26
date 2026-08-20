"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/design-system";
import { markConflictUnclear, reopenConflict, resolveConflict } from "@/lib/cases/conflictActions";
import { getDocumentDownloadUrl } from "@/lib/documents/getDocumentUrl";
import type { ConflictPair } from "@/lib/cases/conflicts";
import { DocumentUploadForm } from "./DocumentUploadForm";

function OpenDocumentButton({
  caseId,
  documentId,
  fileName,
}: {
  caseId: string;
  documentId: string | null;
  fileName: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  if (!documentId) return null;

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          setError(null);
          try {
            const url = await getDocumentDownloadUrl(caseId, documentId);
            window.open(url, "_blank", "noopener,noreferrer");
          } catch {
            setError("Kunne ikke åpne dokumentet.");
          }
        }}
        className="text-[12.5px] font-medium text-primary-ink hover:underline"
      >
        Åpne {fileName ?? "dokumentet"}
      </button>
      {error && <p className="text-[12px] text-danger-ink">{error}</p>}
    </div>
  );
}

function ConflictSide({
  label,
  side,
  caseId,
}: {
  label: string;
  side: ConflictPair["claimA"];
  caseId: string;
}) {
  return (
    <div className="flex-1 rounded-md border border-border bg-surface-alt p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1.5 text-[13.5px] text-ink">{side.statement}</p>
      <div className="mt-2">
        <OpenDocumentButton caseId={caseId} documentId={side.sourceDocumentId} fileName={side.sourceDocumentFileName} />
      </div>
    </div>
  );
}

function ConflictCard({ conflict, caseId }: { conflict: ConflictPair; caseId: string }) {
  return (
    <div id={`konflikt-${conflict.id}`} className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        {conflict.status === "open" && <Badge tone="warning">Åpen konflikt</Badge>}
        {conflict.status === "marked_unclear" && <Badge tone="neutral">Uavklart</Badge>}
        {conflict.status === "resolved" && <Badge tone="success">Løst</Badge>}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <ConflictSide label="Påstand A" side={conflict.claimA} caseId={caseId} />
        <ConflictSide label="Påstand B" side={conflict.claimB} caseId={caseId} />
      </div>

      <p className="mt-3 text-[12.5px] text-ink-soft">Hvorfor dette er en konflikt: {conflict.reasoning}</p>
      <p className="mt-1.5 text-[12.5px] font-medium text-ink">
        For å avklare: {conflict.clarifyingQuestion}
      </p>
      {conflict.recommendedDocument && (
        <p className="mt-1.5 text-[12.5px] font-medium text-primary-ink">
          Anbefalt dokument: {conflict.recommendedDocument}
        </p>
      )}

      {conflict.status === "open" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form action={resolveConflict.bind(null, caseId)}>
            <input type="hidden" name="conflictId" value={conflict.id} />
            <input type="hidden" name="chosenClaimId" value={conflict.claimA.claimId} />
            <input type="hidden" name="rejectedClaimId" value={conflict.claimB.claimId} />
            <Button type="submit" variant="secondary">
              Påstand A er riktig
            </Button>
          </form>
          <form action={resolveConflict.bind(null, caseId)}>
            <input type="hidden" name="conflictId" value={conflict.id} />
            <input type="hidden" name="chosenClaimId" value={conflict.claimB.claimId} />
            <input type="hidden" name="rejectedClaimId" value={conflict.claimA.claimId} />
            <Button type="submit" variant="secondary">
              Påstand B er riktig
            </Button>
          </form>
          <form action={markConflictUnclear.bind(null, caseId)}>
            <input type="hidden" name="conflictId" value={conflict.id} />
            <Button type="submit" variant="ghost">
              Fortsatt uklart
            </Button>
          </form>
          <DocumentUploadForm caseId={caseId} />
        </div>
      )}

      {conflict.status === "marked_unclear" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DocumentUploadForm caseId={caseId} />
          <form action={reopenConflict.bind(null, caseId)}>
            <input type="hidden" name="conflictId" value={conflict.id} />
            <Button type="submit" variant="ghost">
              Vurder på nytt
            </Button>
          </form>
        </div>
      )}

      {conflict.status === "resolved" && (
        <div className="mt-3">
          <p className="text-[12.5px] text-ink-soft">
            {conflict.resolvedClaimId === conflict.claimA.claimId ? "Påstand A" : "Påstand B"} ble bekreftet som
            riktig.
          </p>
          <form action={reopenConflict.bind(null, caseId)} className="mt-2">
            <input type="hidden" name="conflictId" value={conflict.id} />
            <Button type="submit" variant="ghost">
              Gjenåpne
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

export function ConflictWorkspace({ caseId, conflicts }: { caseId: string; conflicts: ConflictPair[] }) {
  if (conflicts.length === 0) {
    return <p className="text-[13.5px] text-ink-soft">Ingen konflikter oppdaget mellom dokumentene i saken.</p>;
  }

  const open = conflicts.filter((c) => c.status === "open");
  const unclear = conflicts.filter((c) => c.status === "marked_unclear");
  const resolved = conflicts.filter((c) => c.status === "resolved");

  return (
    <div className="flex flex-col gap-3">
      {open.map((c) => (
        <ConflictCard key={c.id} conflict={c} caseId={caseId} />
      ))}

      {unclear.length > 0 && (
        <details className="rounded-md border border-border bg-surface-alt p-4" open>
          <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-soft">
            {unclear.length} uavklarte konflikter
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            {unclear.map((c) => (
              <ConflictCard key={c.id} conflict={c} caseId={caseId} />
            ))}
          </div>
        </details>
      )}

      {resolved.length > 0 && (
        <details className="rounded-md border border-border bg-surface-alt p-4">
          <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-soft">
            {resolved.length} løste konflikter
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            {resolved.map((c) => (
              <ConflictCard key={c.id} conflict={c} caseId={caseId} />
            ))}
          </div>
        </details>
      )}

      {open.length === 0 && unclear.length === 0 && resolved.length === 0 && (
        <p className="text-[13.5px] text-ink-soft">Ingen konflikter oppdaget mellom dokumentene i saken.</p>
      )}
    </div>
  );
}
