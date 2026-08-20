/**
 * Marks one specific clause as needing lawyer sign-off, with a concrete
 * note on what exactly is unverified (a missing fact, an uncertain legal
 * mechanism, a product gap the text assumes exists). Deliberately distinct
 * from the page-level "this whole page is a draft" banner -- that banner
 * says the obvious; this says exactly which paragraph is the risky one and
 * why, so a lawyer reviewing this doesn't have to guess where to look
 * hardest.
 */
export function LegalReviewFlag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex gap-2.5 rounded-md border border-l-4 border-warning bg-warning-subtle p-3.5">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-warning-ink">
        Jurist bør sjekke
      </span>
      <p className="text-[12.5px] leading-relaxed text-warning-ink">{children}</p>
    </div>
  );
}
