"use client";

import { useState } from "react";
import { requestRefund } from "@/lib/purchases/requestRefund";
import { REFUND_STATUS_LABELS, type RefundStatus } from "@/lib/purchases/refundRequests";

export function RefundRequestButton({
  purchaseId,
  status,
}: {
  purchaseId: string;
  status: RefundStatus | null;
}) {
  const [localStatus, setLocalStatus] = useState<RefundStatus | null>(status);
  const [formOpen, setFormOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  if (localStatus) {
    return <p className="text-[13px] font-medium text-ink-soft">{REFUND_STATUS_LABELS[localStatus]}</p>;
  }

  if (!formOpen) {
    return (
      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="text-[13px] font-semibold text-ink-soft hover:text-ink hover:underline"
      >
        Be om refusjon
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-md border border-border bg-surface-alt p-3"
      action={async (formData) => {
        setSending(true);
        setError(false);
        try {
          await requestRefund(formData);
          setLocalStatus("open");
        } catch {
          setError(true);
        } finally {
          setSending(false);
        }
      }}
    >
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <label className="text-[12.5px] font-medium text-ink-soft">
        Hvorfor ønsker du refusjon? (valgfritt)
        <textarea
          name="note"
          rows={2}
          className="mt-1 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] text-ink"
        />
      </label>
      {error && <p className="text-[12.5px] text-danger-ink">Noe gikk galt. Prøv igjen.</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-primary-ink disabled:opacity-50"
        >
          {sending ? "Sender..." : "Send forespørsel"}
        </button>
        <button
          type="button"
          onClick={() => setFormOpen(false)}
          className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:bg-surface"
        >
          Avbryt
        </button>
      </div>
    </form>
  );
}
