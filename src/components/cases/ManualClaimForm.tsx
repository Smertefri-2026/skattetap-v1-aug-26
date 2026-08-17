"use client";

import { useRef } from "react";
import { Button } from "@/components/design-system";
import { addManualClaim } from "@/lib/cases/claimActions";

export function ManualClaimForm({ caseId }: { caseId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await addManualClaim(caseId, formData);
        formRef.current?.reset();
      }}
      className="flex gap-2"
    >
      <input
        name="statement"
        placeholder="Legg til et eget notat om saken..."
        minLength={3}
        maxLength={300}
        required
        className="flex-1 rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
      />
      <Button type="submit" variant="secondary">
        Legg til
      </Button>
    </form>
  );
}
