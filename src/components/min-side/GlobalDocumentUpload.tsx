"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/design-system";
import { DocumentUploadForm } from "@/components/cases/DocumentUploadForm";

export function GlobalDocumentUpload({ cases }: { cases: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Last opp dokument
      </Button>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-alt p-4 text-[13.5px] text-ink-soft">
        Du må opprette en sak før du kan laste opp dokumenter.{" "}
        <Link href="/min-side?tab=saker" className="font-semibold text-primary hover:underline">
          Opprett en sak
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-alt p-4">
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-soft">
        Hvilken sak gjelder dokumentet?
        <select
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          className="rounded-md border border-border-strong bg-surface px-3 py-2 text-[13.5px] text-ink"
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <DocumentUploadForm key={caseId} caseId={caseId} />
    </div>
  );
}
