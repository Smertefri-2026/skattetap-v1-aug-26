import type { SupabaseClient } from "@supabase/supabase-js";

export type RefundStatus = "open" | "processing" | "approved" | "rejected";

/** Customer-facing labels -- every one names the *request*, never the
 * refund itself, since there's no automatic Stripe refund yet. "approved"
 * in particular must not read as "you've been refunded": it only means
 * staff approved the request internally, the actual money movement still
 * happens manually in Stripe afterwards. */
export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  open: "Refusjonsforespørsel mottatt",
  processing: "Refusjonsforespørsel under behandling",
  approved: "Refusjonsforespørsel godkjent",
  rejected: "Refusjonsforespørsel avslått",
};

export async function getRefundStatusByPurchaseId(
  supabase: SupabaseClient,
  purchaseIds: string[]
): Promise<Map<string, RefundStatus>> {
  if (purchaseIds.length === 0) return new Map();

  const { data } = await supabase.from("refund_requests").select("purchase_id, status").in("purchase_id", purchaseIds);

  return new Map((data ?? []).map((row) => [row.purchase_id as string, row.status as RefundStatus]));
}
