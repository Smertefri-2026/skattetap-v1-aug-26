import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Refund requests live as contact_messages rows (see requestRefund.ts) --
 * there's no dedicated table yet, so "has this purchase already been
 * requested" is answered by matching this marker plus the purchase id in
 * the message body. Every writer/reader of that shape goes through this
 * one place so the format can't drift between requestRefund, KjopTab, and
 * the admin Refusjoner page.
 */
export const REFUND_REQUEST_MARKER = "Refusjonsforespørsel fra Min side.";

const NOTE_MARKER = "Melding fra kunde:\n";

export function parseRefundRequestMessage(message: string): { purchaseId: string | null; note: string | null } {
  const match = message.match(/Kjøps-ID:\s*([0-9a-f-]{36})/i);
  const noteIndex = message.indexOf(NOTE_MARKER);
  return {
    purchaseId: match ? match[1] : null,
    note: noteIndex === -1 ? null : message.slice(noteIndex + NOTE_MARKER.length).trim() || null,
  };
}

function purchaseIdFromMessage(message: string): string | null {
  return parseRefundRequestMessage(message).purchaseId;
}

export async function getRequestedPurchaseIds(
  supabase: SupabaseClient,
  purchaseIds: string[]
): Promise<Set<string>> {
  if (purchaseIds.length === 0) return new Set();

  const { data } = await supabase
    .from("contact_messages")
    .select("message")
    .like("message", `${REFUND_REQUEST_MARKER}%`);

  const requested = new Set<string>();
  for (const row of data ?? []) {
    const id = purchaseIdFromMessage(row.message as string);
    if (id && purchaseIds.includes(id)) requested.add(id);
  }
  return requested;
}

export async function hasExistingRefundRequest(supabase: SupabaseClient, purchaseId: string): Promise<boolean> {
  const requested = await getRequestedPurchaseIds(supabase, [purchaseId]);
  return requested.has(purchaseId);
}
