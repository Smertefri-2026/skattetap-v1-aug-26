export interface DocumentAmountRow {
  documentFileName: string;
  label: string;
  amountKr: number;
}

/**
 * Deliberately does NOT sum these into one "potential refund" figure --
 * amounts extracted across different documents describe different things
 * (a salary line, a fee, a prior refund) and adding them together would
 * assert a number the system has no actual basis for. Shown as a
 * transparent, sourced list instead: only real amounts already found in
 * real documents, each attributed to the document it came from.
 */
export function FinancialPotentialCard({
  userStatedAmountKr,
  documentAmounts,
}: {
  userStatedAmountKr: number | null;
  documentAmounts: DocumentAmountRow[];
}) {
  if (userStatedAmountKr == null && documentAmounts.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Økonomisk potensial</p>

      {userStatedAmountKr != null && (
        <div className="mt-3">
          <p className="text-[22px] font-semibold text-ink">{userStatedAmountKr.toLocaleString("no-NO")} kr</p>
          <p className="text-[12px] text-ink-soft">Ditt eget anslag, oppgitt i enkel sjekk</p>
        </div>
      )}

      {documentAmounts.length > 0 && (
        <div className={userStatedAmountKr != null ? "mt-4" : "mt-3"}>
          <p className="text-[12px] font-medium text-ink-soft">Beløp funnet i dokumentene</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {documentAmounts.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-[12.5px] text-ink-soft">
                <span>
                  {a.label} <span className="text-ink-faint">({a.documentFileName})</span>
                </span>
                <span className="shrink-0 font-medium text-ink">{a.amountKr.toLocaleString("no-NO")} kr</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] text-ink-faint">
            Beløpene er hentet direkte fra dokumentene og gjelder ulike ting -- ikke en samlet sum.
          </p>
        </div>
      )}
    </section>
  );
}
