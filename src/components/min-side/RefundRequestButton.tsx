"use client";

import { useState } from "react";
import { requestRefund } from "@/lib/purchases/requestRefund";

export function RefundRequestButton({
  purchaseId,
  alreadyRequested,
}: {
  purchaseId: string;
  alreadyRequested: boolean;
}) {
  const [state, setState] = useState<"idle" | "open" | "sending" | "sent" | "error">(
    alreadyRequested ? "sent" : "idle"
  );

  if (state === "sent") {
    return (
      <p className="text-[13px] font-medium text-ink-soft">
        Refusjon forespurt <span className="text-ink-faint">-- vi tar kontakt på e-post.</span>
      </p>
    );
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={() => setState("open")}
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
        setState("sending");
        try {
          await requestRefund(formData);
          setState("sent");
        } catch {
          setState("error");
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
      {state === "error" && <p className="text-[12.5px] text-danger-ink">Noe gikk galt. Prøv igjen.</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-md bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-primary-ink disabled:opacity-50"
        >
          {state === "sending" ? "Sender..." : "Send forespørsel"}
        </button>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:bg-surface"
        >
          Avbryt
        </button>
      </div>
    </form>
  );
}
