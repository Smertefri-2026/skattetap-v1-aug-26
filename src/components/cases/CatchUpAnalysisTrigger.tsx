"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Rendered only when the server-side render already found documents whose
 * case-level analysis is missing under the case's current tier (see
 * SaksbildeView.tsx). Fires the catch-up request once on mount, then
 * refreshes the page so the new conflicts/gaps show up -- no polling, no
 * queue, just one request the size of "however many documents are
 * pending" (see the API route for why that's an accepted, not ignored,
 * limitation).
 */
export function CatchUpAnalysisTrigger({ caseId }: { caseId: string }) {
  const [status, setStatus] = useState<"running" | "done" | "error">("running");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cases/${caseId}/catch-up-analysis`, { method: "POST" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setStatus("done");
          router.refresh();
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  if (status !== "running") return null;

  return (
    <div className="rounded-md border border-primary bg-primary-subtle px-4 py-3">
      <p className="text-[13px] text-primary-ink">
        Vi oppdaterer saken med analysene som nå inngår i det kjøpte nivået...
      </p>
    </div>
  );
}
