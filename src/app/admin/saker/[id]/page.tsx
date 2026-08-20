import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/design-system";
import { stageLabels, statusLabels, statusTones } from "@/lib/cases/labels";
import { getAdminCaseDetail } from "@/lib/admin/queries";
import type { CaseStage, CaseStatus } from "@/lib/cases/types";
import type { ClaimStatus } from "@/lib/cases/claimsWithStatus";

const claimStatusTone: Record<ClaimStatus, "success" | "neutral" | "warning"> = {
  documented: "success",
  undocumented: "neutral",
  conflicting: "warning",
};

export default async function AdminCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminCaseDetail(id);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/saker" className="text-[12.5px] text-ink-faint hover:text-ink-soft">
          ← Alle saker
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">{detail.title}</h1>
          <Badge tone={statusTones[detail.status as CaseStatus] ?? "neutral"}>
            {statusLabels[detail.status as CaseStatus] ?? detail.status}
          </Badge>
        </div>
        <p className="mt-1 text-[13px] text-ink-soft">
          {detail.userEmail} · {stageLabels[detail.stage as CaseStage] ?? detail.stage} ·{" "}
          {detail.taxPeriod ?? "ingen periode"} · opprettet {new Date(detail.createdAt).toLocaleDateString("no-NO")}
        </p>
        {detail.amountKr != null && (
          <p className="mt-1 text-[13px] text-ink-soft">Antatt beløp: {detail.amountKr.toLocaleString("no-NO")} kr</p>
        )}
      </div>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Kjøp</p>
        {detail.purchases.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-ink-soft">Ingen kjøp registrert.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {detail.purchases.map((p) => (
              <li key={p.id} className="text-[13px] text-ink-soft">
                {p.productCode} -- {p.amountKr.toLocaleString("no-NO")} kr -- {p.status} --{" "}
                {new Date(p.createdAt).toLocaleDateString("no-NO")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Dokumenter ({detail.documents.length})
        </p>
        {detail.documents.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-ink-soft">Ingen dokumenter lastet opp.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {detail.documents.map((d) => (
              <li key={d.id} className="text-[13px] text-ink-soft">
                {d.fileName} -- {d.status} -- {new Date(d.uploadedAt).toLocaleDateString("no-NO")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Fakta og påstander ({detail.claims.length})
        </p>
        {detail.claims.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-ink-soft">Ingen fakta identifisert.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {detail.claims.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-[13px] text-ink-soft">
                <Badge tone={claimStatusTone[c.status]}>{c.status}</Badge>
                <span>{c.statement}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Konflikter ({detail.conflicts.length})
        </p>
        {detail.conflicts.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-ink-soft">Ingen konflikter oppdaget.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {detail.conflicts.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-3 text-[13px] text-ink-soft">
                <Badge tone={c.status === "open" ? "warning" : c.status === "resolved" ? "success" : "neutral"}>
                  {c.status}
                </Badge>
                <p className="mt-1.5">
                  &quot;{c.claimA.statement}&quot; vs &quot;{c.claimB.statement}&quot;
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Dokumentasjonshull ({detail.gaps.length})
        </p>
        {detail.gaps.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-ink-soft">Ingen hull registrert.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {detail.gaps.map((g) => (
              <li key={g.id} className="text-[13px] text-ink-soft">
                <Badge tone={g.status === "open" ? "warning" : "success"}>{g.status}</Badge> {g.description}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Samtale med Min saksbehandler ({detail.messages.length} meldinger)
        </p>
        {detail.messages.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-ink-soft">Ingen samtale startet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {detail.messages.map((m) => (
              <li key={m.id} className="rounded-md border border-border p-3 text-[13px]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  {m.role === "user" ? "Bruker" : "Saksbehandler"} ·{" "}
                  {new Date(m.createdAt).toLocaleString("no-NO")}
                </p>
                <p className="mt-1 text-ink-soft">{m.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
