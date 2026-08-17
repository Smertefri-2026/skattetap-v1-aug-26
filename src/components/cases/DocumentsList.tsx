import { Badge } from "@/components/design-system";

interface DocumentRow {
  id: string;
  original_filename: string;
  extraction_status: "pending" | "extracting" | "done" | "failed";
  rejection_reason: string | null;
}

const statusBadge: Record<DocumentRow["extraction_status"], { tone: "info" | "success" | "danger" | "neutral"; label: string }> = {
  pending: { tone: "neutral", label: "Venter" },
  extracting: { tone: "info", label: "Analyserer" },
  done: { tone: "success", label: "Analysert" },
  failed: { tone: "danger", label: "Feilet" },
};

export function DocumentsList({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return <p className="text-[13.5px] text-ink-soft">Ingen dokumenter lastet opp ennå.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {documents.map((doc) => {
        const badge = statusBadge[doc.extraction_status];
        return (
          <li
            key={doc.id}
            className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3"
          >
            <div>
              <p className="text-[13.5px] font-medium text-ink">{doc.original_filename}</p>
              {doc.rejection_reason && (
                <p className="mt-0.5 text-[12px] text-ink-faint">{doc.rejection_reason}</p>
              )}
            </div>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
