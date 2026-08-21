"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/design-system";
import { stageLabels } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";

export function NewReportPicker({
  cases,
  caseStages,
}: {
  cases: { id: string; title: string }[];
  caseStages: Record<string, CaseStage[]>;
}) {
  const [open, setOpen] = useState(false);
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Ny rapport
      </Button>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-alt p-4 text-[13.5px] text-ink-soft">
        Du må opprette en sak før du kan generere en rapport.{" "}
        <Link href="/min-side?tab=saker" className="font-semibold text-primary hover:underline">
          Opprett en sak
        </Link>
      </div>
    );
  }

  const availableStages = caseStages[caseId] ?? [];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-alt p-4">
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-soft">
        Velg sak
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

      {availableStages.length === 0 ? (
        <p className="text-[13px] text-ink-faint">
          Denne saken har ingen tilgjengelige rapporttyper ennå.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {availableStages.map((stage) => (
            <Link
              key={stage}
              href={`/min-side/saker/${caseId}?steg=${stage}`}
              className="rounded-md border border-border-strong bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-surface-alt"
            >
              {stageLabels[stage]} →
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
