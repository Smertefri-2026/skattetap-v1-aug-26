import Link from "next/link";
import { CaseCardMenu } from "./CaseCardMenu";
import { stageLabels } from "@/lib/cases/labels";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export async function PapirkurvTab() {
  const supabase = await createClient();
  const { data: cases } = await supabase
    .from("cases")
    .select("id, title, stage, updated_at")
    .eq("status", "arkivert")
    .order("updated_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[16px] font-semibold text-ink">Papirkurv</h2>
        <p className="mt-1 text-[13px] text-ink-faint">
          Saker du har flyttet til papirkurven. De slettes ikke -- du kan gjenopprette dem når som helst.
        </p>
      </div>

      {!cases || cases.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-alt p-8 text-center">
          <p className="text-[14.5px] text-ink-soft">Papirkurven er tom.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {cases.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-4 rounded-lg border border-border bg-surface-alt p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold text-ink-soft">{c.title}</p>
                <p className="mt-1 text-[12.5px] text-ink-faint">
                  {stageLabels[c.stage as keyof typeof stageLabels]} · Flyttet til papirkurv {formatDate(c.updated_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                <Link
                  href={`/min-side/saker/${c.id}`}
                  className="rounded-md border border-border-strong px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-surface"
                >
                  Åpne sak →
                </Link>
                <CaseCardMenu caseId={c.id} archived={true} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
