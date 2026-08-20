import Link from "next/link";
import { Badge } from "@/components/design-system";
import type { BadgeTone } from "@/components/design-system";
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
    .select("id, amount_kr, status, created_at, case_id, products(name), cases(title)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[16px] font-semibold text-ink">Kjøp</h2>

      {!purchases || purchases.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-alt p-8 text-center">
          <p className="text-[14.5px] text-ink-soft">
            Kjøpshistorikk og kvitteringer vises her når du har kjøpt noe.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {purchases.map((p) => {
            const status = p.status as PurchaseStatus;
            const productName =
              (p.products as unknown as { name: string } | null)?.name ?? "Produkt";
            const caseTitle =
              (p.cases as unknown as { title: string } | null)?.title ?? "Sak";

            return (
              <li key={p.id}>
                <Link
                  href={`/min-side/saker/${p.case_id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface p-5 shadow-sm hover:border-border-strong"
                >
                  <div>
                    <p className="text-[14.5px] font-semibold text-ink">{productName}</p>
                    <p className="mt-1 text-[12.5px] text-ink-faint">
                      {caseTitle} · {new Date(p.created_at).toLocaleDateString("no-NO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-semibold text-ink">
                      {p.amount_kr.toLocaleString("no-NO")} kr
                    </span>
                    <Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
