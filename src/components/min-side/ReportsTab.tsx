import Link from "next/link";
import { Badge } from "@/components/design-system";
import { NewReportPicker } from "./NewReportPicker";
import { stageLabels } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";
import { paidStageOrder } from "@/lib/products/purchaseLinks";
import { getCaseEntitlement } from "@/lib/products/entitlement";
import { getProducts } from "@/lib/products/catalog";
import { createClient } from "@/lib/supabase/server";

interface ReportRow {
  id: string;
  stage: CaseStage;
  caseId: string;
  caseTitle: string;
  createdAt: string;
  downloadable: boolean;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export async function ReportsTab() {
  const supabase = await createClient();

  const [{ data: reports }, { data: assessments }, { data: cases }, products] = await Promise.all([
    supabase
      .from("reports")
      .select("id, type, created_at, case_id, cases(title)")
      .order("created_at", { ascending: false }),
    supabase
      .from("case_assessments")
      .select("id, kind, created_at, case_id, cases(title)")
      .order("created_at", { ascending: false }),
    supabase.from("cases").select("id, title").neq("status", "arkivert").order("title"),
    getProducts(supabase),
  ]);

  const rows: ReportRow[] = [
    ...(reports ?? []).map((r) => ({
      id: r.id,
      stage: r.type as CaseStage,
      caseId: r.case_id,
      caseTitle: (r.cases as unknown as { title: string } | null)?.title ?? "Sak",
      createdAt: r.created_at,
      downloadable: true,
    })),
    ...(assessments ?? []).map((a) => ({
      id: a.id,
      stage: a.kind as CaseStage,
      caseId: a.case_id,
      caseTitle: (a.cases as unknown as { title: string } | null)?.title ?? "Sak",
      createdAt: a.created_at,
      downloadable: false,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const casesList = cases ?? [];
  const productByCode = new Map(products.map((p) => [p.product_code, p]));
  const entitlements = await Promise.all(casesList.map((c) => getCaseEntitlement(supabase, c.id)));

  const caseStages: Record<string, CaseStage[]> = {};
  casesList.forEach((c, i) => {
    const entitlement = entitlements[i];
    const unlocked: CaseStage[] = ["enkel-sjekk"];
    for (const stage of paidStageOrder) {
      const product = productByCode.get(stage);
      if (product && entitlement && entitlement.sort_order >= product.sort_order) {
        unlocked.push(stage);
      }
    }
    caseStages[c.id] = unlocked;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-ink">Rapporter</h2>
        <NewReportPicker cases={casesList} caseStages={caseStages} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-alt p-8 text-center">
          <p className="text-[14.5px] font-semibold text-ink">Ingen rapporter ennå</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Når du har gjennomført en sjekk eller generert en rapport, finner du den her.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[14.5px] font-semibold text-ink">{r.caseTitle}</p>
                  <Badge tone="info">{stageLabels[r.stage]}</Badge>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-faint">Generert {formatDate(r.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                <Link
                  href={`/min-side/saker/${r.caseId}?steg=${r.stage}`}
                  className="rounded-md border border-border-strong px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-surface-alt"
                >
                  Vis
                </Link>
                {r.downloadable && (
                  <a
                    href={`/api/cases/${r.caseId}/reports/${r.id}/pdf`}
                    className="rounded-md border border-border-strong px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-surface-alt"
                  >
                    Last ned PDF
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
