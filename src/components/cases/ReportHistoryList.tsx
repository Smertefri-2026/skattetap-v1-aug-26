import Link from "next/link";
import { stageLabels } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";

export interface ReportHistoryRow {
  id: string;
  type: string;
  createdAt: string;
}

export function ReportHistoryList({ caseId, reports }: { caseId: string; reports: ReportHistoryRow[] }) {
  if (reports.length === 0) {
    return <p className="text-[13.5px] text-ink-soft">Ingen rapporter generert ennå.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {reports.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-3"
        >
          <div>
            <p className="text-[13.5px] font-medium text-ink">{stageLabels[r.type as CaseStage] ?? r.type}</p>
            <p className="text-[12px] text-ink-faint">{new Date(r.createdAt).toLocaleDateString("no-NO")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/min-side/saker/${caseId}?steg=${r.type}`}
              className="text-[12.5px] font-medium text-primary-ink hover:underline"
            >
              Se rapport
            </Link>
            <a
              href={`/api/cases/${caseId}/reports/${r.id}/pdf`}
              className="text-[12.5px] font-medium text-primary-ink hover:underline"
            >
              Last ned PDF
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
