import Link from "next/link";
import { Badge } from "@/components/design-system";
import type { BadgeTone } from "@/components/design-system";
import { RefundRequestButton } from "./RefundRequestButton";
import { getRefundStatusByPurchaseId } from "@/lib/purchases/refundRequests";
import { createClient } from "@/lib/supabase/server";

type PurchaseStatus = "pending" | "completed" | "failed" | "canceled" | "refunded";

const statusLabels: Record<PurchaseStatus, string> = {
  pending: "Behandles",
  completed: "Fullført",
  failed: "Feilet",
  canceled: "Avbrutt",
  refunded: "Refundert",
};

const statusTones: Record<PurchaseStatus, BadgeTone> = {
  pending: "warning",
  completed: "success",
  failed: "danger",
  canceled: "neutral",
  refunded: "neutral",
};

export async function KjopTab() {
  const supabase = await createClient();
  const { data: purchases } = await supabase
    .from("purchases")
    .select(
      "id, amount_kr, status, created_at, case_id, stripe_checkout_session_id, stripe_payment_intent_id, products(name), cases(title)"
    )
    .order("created_at", { ascending: false });

  const completedIds = (purchases ?? []).filter((p) => p.status === "completed").map((p) => p.id);
  const refundStatusByPurchaseId = await getRefundStatusByPurchaseId(supabase, completedIds);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[16px] font-semibold text-ink">Kjøp</h2>

      {!purchases || purchases.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-alt p-8 text-center">
          <p className="text-[14.5px] font-semibold text-ink">Ingen kjøp ennå</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Se{" "}
            <Link href="/priser" className="font-semibold text-primary hover:underline">
              prisene våre
            </Link>{" "}
            for å komme i gang.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {purchases.map((p) => {
            const status = p.status as PurchaseStatus;
            const productName =
              (p.products as unknown as { name: string } | null)?.name ?? "Produkt";
            const caseTitle = p.case_id ? ((p.cases as unknown as { title: string } | null)?.title ?? "Sak") : "Slettet sak";
            const hasReceipt = p.stripe_checkout_session_id || p.stripe_payment_intent_id;
            const purchaseInfo = (
              <>
                <p className="truncate text-[14.5px] font-semibold text-ink">{productName}</p>
                <p className="mt-1 text-[12.5px] text-ink-faint">
                  {caseTitle} · {new Date(p.created_at).toLocaleDateString("nb-NO")}
                </p>
              </>
            );

            return (
              <li key={p.id} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  {p.case_id ? (
                    <Link href={`/min-side/saker/${p.case_id}`} className="min-w-0 hover:underline">
                      {purchaseInfo}
                    </Link>
                  ) : (
                    <div className="min-w-0">{purchaseInfo}</div>
                  )}
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-[14px] font-semibold text-ink">
                      {p.amount_kr.toLocaleString("no-NO")} kr
                    </span>
                    <Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>
                  </div>
                </div>

                {status === "completed" && (
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3">
                    {hasReceipt && (
                      <a
                        href={`/api/purchases/${p.id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] font-semibold text-ink-soft hover:text-ink hover:underline"
                      >
                        Vis kvittering
                      </a>
                    )}
                    <RefundRequestButton purchaseId={p.id} status={refundStatusByPurchaseId.get(p.id) ?? null} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
