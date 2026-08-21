import type { SupabaseClient } from "@supabase/supabase-js";

export type RefundStatus = "open" | "processing" | "approved" | "rejected";

/** Customer-facing labels -- never claim the refund itself is done, only
 * that the request has that status. "approved" is safe to show as-is
 * once an admin has actually set it, since that's now a real recorded
 * decision, not a guess. */
export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  open: "Refusjon forespurt",
  processing: "Refusjon under behandling",
  approved: "Refusjon godkjent",
  rejected: "Refusjon avslått",
};

export async function getRefundStatusByPurchaseId(
  supabase: SupabaseClient,
  purchaseIds: string[]
): Promise<Map<string, RefundStatus>> {
  if (purchaseIds.length === 0) return new Map();

  const { data } = await supabase.from("refund_requests").select("purchase_id, status").in("purchase_id", purchaseIds);

  return new Map((data ?? []).map((row) => [row.purchase_id as string, row.status as RefundStatus]));
}
