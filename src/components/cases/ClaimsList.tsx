"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/design-system";
import { confirmClaim, correctClaim } from "@/lib/cases/claimActions";
import type { ClaimStatus, ClaimWithStatus } from "@/lib/cases/claimsWithStatus";

const statusBadge: Record<ClaimStatus, { tone: "success" | "neutral" | "warning"; label: string }> = {
  documented: { tone: "success", label: "Dokumentert" },
  undocumented: { tone: "neutral", label: "Udokumentert" },
  conflicting: { tone: "warning", label: "Motstridende" },
};

function ClaimRow({ claim, caseId }: { claim: ClaimWithStatus; caseId: string }) {
  const [editing, setEditing] = useState(false);
  const badge = statusBadge[claim.status];
  const needsConfirmation = claim.origin === "ai_suggested" && !claim.confirmed_by_user;

  if (editing) {
    return (
      <li className="rounded-md border border-border bg-surface p-4">
        <form
          action={async (formData: FormData) => {
            await correctClaim(caseId, formData);
            setEditing(false);
          }}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="claimId" value={claim.id} />
          <textarea
            name="statement"
            defaultValue={claim.statement}
            rows={2}
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <Button type="submit">Lagre</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Avbryt
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[13.5px] text-ink">{claim.statement}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            {claim.origin === "ai_suggested" && <Badge tone="info">KI-forslag</Badge>}
            {claim.origin === "user" && <Badge tone="neutral">Eget notat</Badge>}
          </div>
          <p className="mt-1.5 text-[12px] text-ink-faint">{claim.reasoning}</p>
        </div>
        {needsConfirmation && (
          <div className="flex shrink-0 gap-2">
            <form action={confirmClaim.bind(null, caseId)}>
              <input type="hidden" name="claimId" value={claim.id} />
              <Button type="submit" variant="secondary">
                Bekreft
              </Button>
            </form>
            <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
              Rediger
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

export function ClaimsList({ claims, caseId }: { claims: ClaimWithStatus[]; caseId: string }) {
  if (claims.length === 0) {
    return (
      <p className="text-[13.5px] text-ink-soft">
        Ingen fakta identifisert ennå. Last opp et dokument eller legg til et notat.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {claims.map((claim) => (
        <ClaimRow key={claim.id} claim={claim} caseId={caseId} />
      ))}
    </ul>
  );
}
