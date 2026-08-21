"use client";

import { useState } from "react";
import { Button } from "@/components/design-system";
import { deleteCasePermanently } from "@/lib/cases/actions";

export function DeleteCaseButton({ caseId, caseTitle }: { caseId: string; caseTitle: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [state, setState] = useState<"idle" | "deleting" | "error">("idle");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-semibold text-danger-ink hover:underline"
      >
        Slett permanent
      </button>
    );
  }

  const matches = confirmText === caseTitle;

  return (
    <form
      className="flex w-full flex-col gap-2.5 rounded-md border border-danger bg-danger-subtle p-3.5"
      action={async (formData) => {
        setState("deleting");
        try {
          await deleteCasePermanently(formData);
        } catch {
          setState("error");
        }
      }}
    >
      <input type="hidden" name="caseId" value={caseId} />
      <p className="text-[13px] font-semibold text-danger-ink">
        Slett saken permanent? Dette kan ikke angres.
      </p>
      <p className="text-[12.5px] text-ink-soft">
        All dokumentasjon, opplysninger og rapporter i saken slettes for godt. Kjøpshistorikk beholdes.
        Skriv inn saksnavnet <span className="font-semibold text-ink">{caseTitle}</span> for å bekrefte.
      </p>
      <input
        type="text"
        name="confirmTitle"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={caseTitle}
        className="w-full rounded-md border border-danger bg-surface px-2.5 py-1.5 text-[13px] text-ink"
      />
      {state === "error" && (
        <p className="text-[12.5px] text-danger-ink">Kunne ikke slette saken. Sjekk at saksnavnet er riktig.</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={!matches || state === "deleting"}>
          {state === "deleting" ? "Sletter..." : "Slett permanent"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmText("");
            setState("idle");
          }}
          className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:bg-surface"
        >
          Avbryt
        </button>
      </div>
    </form>
  );
}
