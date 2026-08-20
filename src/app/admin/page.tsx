import Link from "next/link";
import { Card } from "@/components/design-system";
import { stageLabels } from "@/lib/cases/labels";
import { getAdminOverview } from "@/lib/admin/queries";
import type { CaseStage } from "@/lib/cases/types";

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-ink">Oversikt</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Brukere</p>
          <p className="mt-2 text-[26px] font-semibold text-ink">{overview.userCount}</p>
        </Card>
        <Card>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Omsetning (fullført)</p>
          <p className="mt-2 text-[26px] font-semibold text-ink">
            {overview.totalRevenueKr.toLocaleString("no-NO")} kr
          </p>
        </Card>
        <Card>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Åpne eskaleringer</p>
          <p className="mt-2 text-[26px] font-semibold text-ink">{overview.openEscalationCount}</p>
          {overview.openEscalationCount > 0 && (
            <Link href="/admin/support" className="mt-1 inline-block text-[12.5px] text-primary-ink hover:underline">
              Se support →
            </Link>
          )}
        </Card>
        <Card>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">KI-kall siste 24t</p>
          <p className="mt-2 text-[26px] font-semibold text-ink">
            {overview.aiCallCount24h}
            {overview.aiCallErrorCount24h > 0 && (
              <span className="ml-2 text-[14px] font-medium text-danger-ink">
                {overview.aiCallErrorCount24h} feilet
              </span>
            )}
          </p>
        </Card>
      </div>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Saker per steg</p>
        <div className="mt-3 flex flex-wrap gap-4">
          {(Object.keys(stageLabels) as CaseStage[]).map((stage) => (
            <Card key={stage} className="min-w-[140px]">
              <p className="text-[12.5px] text-ink-soft">{stageLabels[stage]}</p>
              <p className="mt-1 text-[20px] font-semibold text-ink">{overview.caseCountByStage[stage] ?? 0}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
