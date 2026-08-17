import Link from "next/link";
import { Badge } from "@/components/design-system";
import { createClient } from "@/lib/supabase/server";

export async function ReportsTab() {
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("id, type, created_at, case_id, cases(title)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[16px] font-semibold text-ink">Rapporter</h2>

      {!reports || reports.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-alt p-8 text-center">
          <p className="text-[14.5px] text-ink-soft">
            Enkle sjekker, fulle rapporter, skatteendringer og utredninger samles her etter
            hvert som de genereres.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/min-side/saker/${r.case_id}?steg=full-sjekk`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-5 shadow-sm hover:border-border-strong"
              >
                <div>
                  <p className="text-[14.5px] font-semibold text-ink">
                    {(r.cases as unknown as { title: string } | null)?.title ?? "Sak"}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-faint">
                    {new Date(r.created_at).toLocaleDateString("no-NO")}
                  </p>
                </div>
                <Badge tone="info">Full sjekk</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
