"use client";

import { useState } from "react";
import { getDocumentDownloadUrl } from "@/lib/documents/getDocumentUrl";

/**
 * Opens a document via a short-lived signed URL, same mechanism everywhere
 * a user needs to look at a source document -- the conflict workspace and
 * the document list both use this, one place that knows how.
 */
export function OpenDocumentButton({
  caseId,
  documentId,
  label,
}: {
  caseId: string;
  documentId: string | null;
  label: string;
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
        {label}
      </button>
      {error && <p className="text-[12px] text-danger-ink">{error}</p>}
    </div>
  );
}
