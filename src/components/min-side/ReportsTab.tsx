import Link from "next/link";
import { Badge } from "@/components/design-system";
import { stageLabels } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";
import { createClient } from "@/lib/supabase/server";

interface ReportRow {
  id: string;
  stage: CaseStage;
  caseId: string;
  caseTitle: string;
  createdAt: string;
}

export async function ReportsTab() {
  const supabase = await createClient();

  const [{ data: reports }, { data: assessments }] = await Promise.all([
    supabase
      .from("reports")
      .select("id, type, created_at, case_id, cases(title)")
      .order("created_at", { ascending: false }),
    supabase
      .from("case_assessments")
      .select("id, kind, created_at, case_id, cases(title)")
      .order("created_at", { ascending: false }),
  ]);

  const rows: ReportRow[] = [
    ...(reports ?? []).map((r) => ({
      id: r.id,
      stage: r.type as CaseStage,
      caseId: r.case_id,
      caseTitle: (r.cases as unknown as { title: string } | null)?.title ?? "Sak",
      createdAt: r.created_at,
    })),
    ...(assessments ?? []).map((a) => ({
      id: a.id,
      stage: a.kind as CaseStage,
      caseId: a.case_id,
      caseTitle: (a.cases as unknown as { title: string } | null)?.title ?? "Sak",
      createdAt: a.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[16px] font-semibold text-ink">Rapporter</h2>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-alt p-8 text-center">
          <p className="text-[14.5px] text-ink-soft">
            Enkle sjekker, fulle rapporter, skatteendringer og utredninger samles her etter
            hvert som de genereres.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/min-side/saker/${r.caseId}?steg=${r.stage}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-5 shadow-sm hover:border-border-strong"
              >
                <div>
                  <p className="text-[14.5px] font-semibold text-ink">{r.caseTitle}</p>
                  <p className="mt-1 text-[12.5px] text-ink-faint">
                    {new Date(r.createdAt).toLocaleDateString("no-NO")}
                  </p>
                </div>
                <Badge tone="info">{stageLabels[r.stage]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
