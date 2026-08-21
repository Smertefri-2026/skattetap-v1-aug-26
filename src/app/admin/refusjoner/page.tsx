import Link from "next/link";
import { Badge, Button } from "@/components/design-system";
import type { BadgeTone } from "@/components/design-system";
import { listRefundRequests } from "@/lib/admin/queries";
import { updateRefundRequest } from "@/lib/admin/actions";
import type { RefundStatus } from "@/lib/purchases/refundRequests";

const STATUS_LABELS: Record<RefundStatus, string> = {
  open: "Åpen",
  processing: "Under behandling",
  approved: "Godkjent",
  rejected: "Avslått",
};

const STATUS_TONES: Record<RefundStatus, BadgeTone> = {
  open: "warning",
  processing: "info",
  approved: "success",
  rejected: "danger",
};

export default async function AdminRefundsPage() {
  const requests = await listRefundRequests();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Refusjoner</h1>
        <p className="text-[12.5px] text-ink-faint">{requests.length} forespørsel/forespørsler</p>
      </div>

      <div className="rounded-lg border border-border-strong bg-surface-alt p-4 text-[12.5px] text-ink-soft">
        Status her endrer kun det interne sporet -- ingen refusjon sendes automatisk til Stripe. Gjennomfør
        selve refusjonen manuelt i Stripe dashboard, og oppdater status her etterpå.
      </div>

      {requests.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-6 text-[13.5px] text-ink-soft">
          Ingen refusjonsforespørsler ennå.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13.5px] font-semibold text-ink">{r.userEmail}</p>
                    <Badge tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-soft">
                    {r.productName} ·{" "}
                    {r.caseId ? (
                      <Link href={`/admin/saker/${r.caseId}`} className="text-primary-ink hover:underline">
                        {r.caseTitle}
                      </Link>
                    ) : (
                      r.caseTitle
                    )}{" "}
                    · {r.amountKr.toLocaleString("no-NO")} kr
                  </p>
                  <p className="mt-1 text-[12px] text-ink-faint">
                    Forespurt {new Date(r.requestedAt).toLocaleString("no-NO")}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[13px] text-ink-soft">
                <span className="font-medium text-ink">Begrunnelse:</span> {r.reason ?? "(ingen begrunnelse oppgitt)"}
              </p>

              <form
                key={r.updatedAt}
                action={updateRefundRequest}
                className="mt-4 flex flex-col gap-2.5 border-t border-border pt-3.5 sm:flex-row sm:items-end"
              >
                <input type="hidden" name="requestId" value={r.id} />
                <label className="flex flex-1 flex-col gap-1 text-[12px] font-medium text-ink-soft">
                  Status
                  <select
                    name="status"
                    defaultValue={r.status}
                    className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] text-ink"
                  >
                    {(Object.keys(STATUS_LABELS) as RefundStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-[2] flex-col gap-1 text-[12px] font-medium text-ink-soft">
                  Intern merknad
                  <input
                    type="text"
                    name="adminNote"
                    defaultValue={r.adminNote ?? ""}
                    placeholder="Kun synlig for admin"
                    className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] text-ink"
                  />
                </label>
                <Button type="submit" variant="secondary">
                  Lagre
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
