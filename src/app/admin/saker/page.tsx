import Link from "next/link";
import { Badge } from "@/components/design-system";
import { stageLabels, statusLabels, statusTones } from "@/lib/cases/labels";
import { listAdminCases } from "@/lib/admin/queries";
import type { CaseStage, CaseStatus } from "@/lib/cases/types";

export default async function AdminCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const cases = await listAdminCases(q ?? "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Saker</h1>
        <p className="text-[12.5px] text-ink-faint">{cases.length} sak(er)</p>
      </div>

      <form className="max-w-sm">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Søk på tittel eller e-post..."
          className="w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
        />
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-semibold">Tittel</th>
              <th className="px-4 py-3 font-semibold">Bruker</th>
              <th className="px-4 py-3 font-semibold">Steg</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Beløp</th>
              <th className="px-4 py-3 font-semibold">Opprettet</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                <td className="px-4 py-3">
                  <Link href={`/admin/saker/${c.id}`} className="font-medium text-primary-ink hover:underline">
                    {c.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{c.userEmail}</td>
                <td className="px-4 py-3 text-ink-soft">{stageLabels[c.stage as CaseStage] ?? c.stage}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTones[c.status as CaseStatus] ?? "neutral"}>
                    {statusLabels[c.status as CaseStatus] ?? c.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {c.amountKr != null ? `${c.amountKr.toLocaleString("no-NO")} kr` : "-"}
                </td>
                <td className="px-4 py-3 text-ink-faint">
                  {new Date(c.createdAt).toLocaleDateString("no-NO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cases.length === 0 && <p className="px-4 py-6 text-[13.5px] text-ink-soft">Ingen saker funnet.</p>}
      </div>
    </div>
  );
}
