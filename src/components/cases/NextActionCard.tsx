import Link from "next/link";
import { nextActionCta } from "@/lib/cases/nextActionCta";
import type { CaseStage } from "@/lib/cases/types";
import type { NextActionType } from "@/lib/cases/nextActionEngine";

export interface OtherOpenItem {
  label: string;
  href: string;
}

export function NextActionCard({
  caseId,
  stage,
  action,
  reasoning,
  actionType,
  singleOpenGapId,
  otherOpenItems,
}: {
  caseId: string;
  stage: CaseStage;
  action: string | null;
  reasoning: string | null;
  actionType: NextActionType | null;
  singleOpenGapId?: string;
  otherOpenItems?: OtherOpenItem[];
}) {
  if (!action) {
    return null;
  }

  const cta = actionType ? nextActionCta(actionType, caseId, stage, singleOpenGapId) : null;

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

      {otherOpenItems && otherOpenItems.length > 0 && (
        <div className="mt-4 border-t border-primary/25 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-ink">
            Andre åpne oppgaver
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {otherOpenItems.map((item, i) => (
              <li key={i}>
                <Link href={item.href} className="text-[12.5px] font-medium text-primary-ink hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
