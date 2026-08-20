import Link from "next/link";
import { Badge, Button } from "@/components/design-system";
import { listSupportEscalations } from "@/lib/admin/queries";
import { reopenSupportEscalation, resolveSupportEscalation } from "@/lib/admin/actions";

export default async function AdminSupportPage() {
  const escalations = await listSupportEscalations();
  const open = escalations.filter((e) => e.status === "open");
  const resolved = escalations.filter((e) => e.status === "resolved");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-ink">Support</h1>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Åpne eskaleringer ({open.length})
        </p>
        {open.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-ink-soft">Ingen åpne eskaleringer.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {open.map((e) => (
              <div key={e.id} className="rounded-lg border border-warning bg-warning-subtle p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/saker/${e.caseId}`}
                    className="text-[13.5px] font-semibold text-primary-ink hover:underline"
                  >
                    {e.caseTitle}
                  </Link>
                  <span className="text-[12px] text-ink-faint">
                    {e.userEmail} · {new Date(e.createdAt).toLocaleString("no-NO")}
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-medium text-ink">Begrunnelse: {e.reason}</p>
                <p className="mt-1.5 text-[12.5px] text-ink-soft">Saksbehandlerens siste svar: {e.messageContent}</p>
                <form action={resolveSupportEscalation} className="mt-3">
                  <input type="hidden" name="escalationId" value={e.id} />
                  <Button type="submit" variant="secondary">
                    Merk som løst
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
            Løste eskaleringer ({resolved.length})
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {resolved.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <Link href={`/admin/saker/${e.caseId}`} className="text-[13px] font-medium text-ink hover:underline">
                    {e.caseTitle}
                  </Link>
                  <p className="text-[12px] text-ink-faint">
                    {e.userEmail} · løst {e.resolvedAt ? new Date(e.resolvedAt).toLocaleDateString("no-NO") : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="success">Løst</Badge>
                  <form action={reopenSupportEscalation}>
                    <input type="hidden" name="escalationId" value={e.id} />
                    <Button type="submit" variant="ghost">
                      Gjenåpne
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
