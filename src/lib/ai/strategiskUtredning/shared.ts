import type { CaseSummary } from "@/lib/cases/crossCaseSummaries";

/** Same safety pattern as the Komplett sak engines: cases are referenced
 * by a 1-based index into the summary list the model was given, never by
 * case_id, so a reference can only ever point at a case that was actually
 * included -- indices out of range are dropped, never trusted. */
export function formatIndexedCases(summaries: CaseSummary[]): string {
  if (summaries.length === 0) return "(ingen saker)";
  return summaries
    .map((s, i) => {
      const n = i + 1;
      return [
        `[${n}] "${s.title}"${s.is_primary ? " (denne saken)" : ""}`,
        `    Periode: ${s.tax_period ?? "ikke oppgitt"}, type: ${s.tax_type}, utfall: ${s.outcome}`,
        `    Beløp: ${s.total_amount_kr} kr. Dokumenterte fakta: ${s.documented_claim_count}, udokumenterte: ${s.undocumented_claim_count}, motstridende: ${s.conflicting_claim_count}`,
        `    Sterkeste punkter: ${s.top_documented_facts.join("; ") || "ingen registrert"}`,
        `    Svakeste punkter/hull: ${s.key_gaps.join("; ") || "ingen registrert"}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function isValidCaseIndex(summaries: CaseSummary[], index: number): boolean {
  return index >= 1 && index <= summaries.length;
}
