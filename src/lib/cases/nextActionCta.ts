import type { CaseStage } from "./types";
import type { NextActionType } from "./nextActionEngine";

/**
 * Single source of truth for where "neste anbefalte handling" points --
 * rendered once, by NextActionCard, directly below Min saksbehandler on the
 * merged saksflate. Always targets an absolute path with an explicit steg,
 * since callers can't assume "the default view already is saksbilde".
 *
 * singleOpenGapId: nextActionEngine's output has no id back to the specific
 * documentation_gap it was reasoning about (it only ever sees
 * {description, importance}, never an id -- see refreshNextAction.ts), so
 * this can't be looked up reliably in the general case without a schema
 * change. When the case has exactly one open gap, though, "the gap this
 * upload recommendation means" is unambiguous, so the caller resolves that
 * and passes it in; anything else (zero or several open gaps) falls back
 * to the general documents section rather than guessing which one.
 */
export function nextActionCta(
  actionType: NextActionType,
  caseId: string,
  stage: CaseStage,
  singleOpenGapId?: string
): { label: string; href: string } | null {
  switch (actionType) {
    case "upload_document": {
      const anchor = singleOpenGapId ? `#hull-${singleOpenGapId}` : "#dokumenter";
      return { label: "Last opp dokument", href: `/min-side/saker/${caseId}?steg=saksbilde${anchor}` };
    }
    case "resolve_conflict":
      return { label: "Avklar konflikten", href: `/min-side/saker/${caseId}?steg=saksbilde#konflikter` };
    case "generate_report":
    case "purchase_upgrade":
      return { label: "Gå videre", href: `/min-side/saker/${caseId}?steg=${stage}` };
    case "talk_to_advisor":
      return {
        label: "Snakk med Min saksbehandler",
        href: `/min-side/saker/${caseId}?steg=saksbilde#saksbehandler`,
      };
    case "provide_information":
      return null;
  }
}
