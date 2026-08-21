import Link from "next/link";
import { Badge } from "@/components/design-system";
import { CaseCardMenu } from "./CaseCardMenu";
import { CaseCreateForm } from "./CaseCreateForm";
import { stageLabels, statusLabels, statusTones } from "@/lib/cases/labels";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export async function CasesTab() {
  const supabase = await createClient();
  const { data: cases } = await supabase
    .from("cases")
    .select("id, title, stage, status, updated_at")
    .neq("status", "arkivert")
    .order("updated_at", { ascending: false });

  const caseIds = (cases ?? []).map((c) => c.id);

  const [documentCounts, openGapCounts] = await Promise.all([
    caseIds.length
      ? supabase.from("documents").select("case_id").in("case_id", caseIds)
      : Promise.resolve({ data: [] as { case_id: string }[] }),
    caseIds.length
      ? supabase
          .from("documentation_gaps")
          .select("case_id")
          .in("case_id", caseIds)
          .eq("status", "open")
      : Promise.resolve({ data: [] as { case_id: string }[] }),
  ]);

  const docCountByCase = new Map<string, number>();
  for (const row of documentCounts.data ?? []) {
    docCountByCase.set(row.case_id, (docCountByCase.get(row.case_id) ?? 0) + 1);
  }
  const gapCountByCase = new Map<string, number>();
  for (const row of openGapCounts.data ?? []) {
    gapCountByCase.set(row.case_id, (gapCountByCase.get(row.case_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-ink">Dine saker</h2>
        <CaseCreateForm />
      </div>

      {!cases || cases.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-alt p-8 text-center">
          <p className="text-[14.5px] text-ink-soft">
            Du har ingen saker ennå. Opprett en sak for å starte en enkel
            sjekk.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {cases.map((c) => {
            const docCount = docCountByCase.get(c.id) ?? 0;
            const gapCount = gapCountByCase.get(c.id) ?? 0;
            return (
              <li
                key={c.id}
                className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{c.title}</p>
                    <Badge tone={statusTones[c.status as keyof typeof statusTones]}>
                      {statusLabels[c.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-faint">
                    {stageLabels[c.stage as keyof typeof stageLabels]} · Sist oppdatert {formatDate(c.updated_at)}
                    {docCount > 0 && ` · ${docCount} ${docCount === 1 ? "dokument" : "dokumenter"}`}
                    {gapCount > 0 && ` · ${gapCount} åpne ${gapCount === 1 ? "avvik" : "avvik"}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                  <Link
                    href={`/min-side/saker/${c.id}`}
                    className="rounded-md border border-border-strong px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-surface-alt"
                  >
                    Åpne sak →
                  </Link>
                  <CaseCardMenu caseId={c.id} archived={false} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
