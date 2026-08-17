import Link from "next/link";
import { Badge } from "@/components/design-system";
import { CaseCreateForm } from "./CaseCreateForm";
import { stageLabels, statusLabels, statusTones } from "@/lib/cases/labels";
import { createClient } from "@/lib/supabase/server";

export async function CasesTab() {
  const supabase = await createClient();
  const { data: cases } = await supabase
    .from("cases")
    .select("id, title, stage, status, updated_at")
    .order("updated_at", { ascending: false });

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
          {cases.map((c) => (
            <li key={c.id}>
              <Link
                href={`/min-side/saker/${c.id}?steg=${c.stage}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-5 shadow-sm hover:border-border-strong"
              >
                <div>
                  <p className="text-[14.5px] font-semibold text-ink">
                    {c.title}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-faint">
                    {stageLabels[c.stage as keyof typeof stageLabels]}
                  </p>
                </div>
                <Badge tone={statusTones[c.status as keyof typeof statusTones]}>
                  {statusLabels[c.status as keyof typeof statusLabels]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
