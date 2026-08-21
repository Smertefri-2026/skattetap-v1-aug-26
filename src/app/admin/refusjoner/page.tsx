import Link from "next/link";
import { listRefundRequests } from "@/lib/admin/queries";

export default async function AdminRefundsPage() {
  const requests = await listRefundRequests();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Refusjoner</h1>
        <p className="text-[12.5px] text-ink-faint">{requests.length} forespørsel/forespørsler</p>
      </div>

      <div className="rounded-lg border border-border-strong bg-surface-alt p-4 text-[12.5px] text-ink-soft">
        Dette er en synlighetsliste over refusjonsforespørsler fra Min side. Det finnes ennå ingen
        egen statuskolonne (Åpen / Under behandling / Avslått / Godkjent) -- det krever en liten
        databaseendring som ikke er godkjent ennå. Håndter forespørslene direkte per e-post
        inntil videre.
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-semibold">Bruker</th>
              <th className="px-4 py-3 font-semibold">Sak</th>
              <th className="px-4 py-3 font-semibold">Produkt</th>
              <th className="px-4 py-3 font-semibold">Beløp</th>
              <th className="px-4 py-3 font-semibold">Kjøpsstatus</th>
              <th className="px-4 py-3 font-semibold">Begrunnelse</th>
              <th className="px-4 py-3 font-semibold">Forespurt</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-border align-top last:border-0 hover:bg-surface-alt">
                <td className="px-4 py-3 font-medium text-ink">{r.userEmail}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {r.caseId ? (
                    <Link href={`/admin/saker/${r.caseId}`} className="text-primary-ink hover:underline">
                      {r.caseTitle}
                    </Link>
                  ) : (
                    r.caseTitle
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft">{r.productName}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {r.amountKr != null ? `${r.amountKr.toLocaleString("no-NO")} kr` : "-"}
                </td>
                <td className="px-4 py-3 text-ink-soft">{r.purchaseStatus ?? "-"}</td>
                <td className="max-w-xs px-4 py-3 text-ink-soft">{r.reason ?? "(ingen begrunnelse oppgitt)"}</td>
                <td className="px-4 py-3 text-ink-faint">
                  {new Date(r.requestedAt).toLocaleString("no-NO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && (
          <p className="px-4 py-6 text-[13.5px] text-ink-soft">Ingen refusjonsforespørsler ennå.</p>
        )}
      </div>
    </div>
  );
}
