"use client";

import { useState } from "react";
import { Button } from "@/components/design-system";
import { createCase } from "@/lib/cases/actions";

export function CaseCreateForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Ny sak</Button>;
  }

  return (
    <form
      action={createCase}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="title" className="text-[13px] font-medium text-ink">
          Hva gjelder saken?
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={200}
          placeholder="F.eks. Pendlerfradrag 2023"
          className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit">Opprett sak</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
