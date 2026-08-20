import Link from "next/link";
import type { CaseStage } from "@/lib/cases/types";
import type { NextActionType } from "@/lib/cases/nextActionEngine";

function ctaFor(
  actionType: NextActionType,
  caseId: string,
  stage: CaseStage
): { label: string; href: string } | null {
  switch (actionType) {
    case "upload_document":
      return { label: "Last opp dokument", href: `/min-side/saker/${caseId}#dokumenter` };
    case "resolve_conflict":
      return { label: "Avklar konflikten", href: `/min-side/saker/${caseId}#konflikter` };
    case "generate_report":
    case "purchase_upgrade":
      return { label: "Gå videre", href: `/min-side/saker/${caseId}?steg=${stage}` };
    case "talk_to_advisor":
      return { label: "Snakk med Min saksbehandler", href: `/min-side/saker/${caseId}?steg=saksbehandler` };
    case "provide_information":
      return null;
  }
}

export function NextActionCard({
  caseId,
  stage,
  action,
  reasoning,
  actionType,
}: {
  caseId: string;
  stage: CaseStage;
  action: string | null;
  reasoning: string | null;
  actionType: NextActionType | null;
}) {
  if (!action) {
    return null;
  }

  const cta = actionType ? ctaFor(actionType, caseId, stage) : null;

  return (
    <section className="rounded-lg border border-primary bg-primary-subtle p-5">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-primary-ink">
        Neste anbefalte handling
      </p>
      <p className="mt-2 text-[15px] font-semibold text-ink">{action}</p>
      {reasoning && <p className="mt-1.5 text-[13px] text-primary-ink">{reasoning}</p>}
      {cta && (
        <Link
          href={cta.href}
          className="mt-3 inline-flex rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-ink"
        >
          {cta.label}
        </Link>
      )}
    </section>
  );
}
