import type { SupabaseClient } from "@supabase/supabase-js";

export interface DeadlineException {
  condition: string;
  effect: string;
}

export interface DeadlineAssessment {
  case_id: string;
  status: "vurdert" | "ikke_vurdert";
  deadline_date: string | null;
  deadline_type: string | null;
  rule_code: string | null;
  source: string | null;
  exceptions: DeadlineException[];
  note: string;
}

function parseYear(period: string | null): number | null {
  if (!period) return null;
  const match = period.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

/**
 * Entirely deterministic and conservative by construction: RLS already
 * hides any rule that isn't quality_assured, but this also filters
 * explicitly so the "never guess" behavior doesn't rely on RLS alone.
 * Every path that can't produce a real computed date returns
 * "ikke_vurdert" with a specific reason -- there is no fallback estimate.
 */
export async function evaluateDeadlines(
  supabase: SupabaseClient,
  cases: { case_id: string; tax_type: string; tax_period: string | null }[]
): Promise<DeadlineAssessment[]> {
  const { data: rules } = await supabase
    .from("tax_deadline_rules")
    .select("*")
    .eq("quality_assured", true);

  const today = new Date().toISOString().slice(0, 10);

  return cases.map((c): DeadlineAssessment => {
    const candidates = (rules ?? []).filter((r) => {
      const appliesToType = r.applies_to_tax_type == null || r.applies_to_tax_type === c.tax_type;
      const isActive = r.valid_from <= today && (r.valid_to == null || r.valid_to >= today);
      return appliesToType && isActive;
    });

    if (candidates.length === 0) {
      return {
        case_id: c.case_id,
        status: "ikke_vurdert",
        deadline_date: null,
        deadline_type: null,
        rule_code: null,
        source: null,
        exceptions: [],
        note: "Ingen kvalitetssikret fristregel funnet for denne sakstypen.",
      };
    }

    // Prefer a rule specific to this tax_type over a generic one; break
    // remaining ties by the most recently published rule.
    const rule = [...candidates].sort((a, b) => {
      const specificityDiff = Number(b.applies_to_tax_type != null) - Number(a.applies_to_tax_type != null);
      if (specificityDiff !== 0) return specificityDiff;
      return b.valid_from.localeCompare(a.valid_from);
    })[0];

    const year = parseYear(c.tax_period);
    if (year == null || rule.months_after_period_end == null) {
      return {
        case_id: c.case_id,
        status: "ikke_vurdert",
        deadline_date: null,
        deadline_type: rule.deadline_type,
        rule_code: rule.rule_code,
        source: rule.source,
        exceptions: (rule.exceptions as DeadlineException[]) ?? [],
        note:
          year == null
            ? "Kan ikke beregne frist -- sakens periode er ikke på et gjenkjennbart årsformat."
            : "Fant en gjeldende fristregel, men den mangler et beregnbart tidsvindu.",
      };
    }

    const periodEnd = new Date(Date.UTC(year, 11, 31));
    const deadline = new Date(periodEnd);
    deadline.setUTCMonth(deadline.getUTCMonth() + rule.months_after_period_end);

    return {
      case_id: c.case_id,
      status: "vurdert",
      deadline_date: deadline.toISOString().slice(0, 10),
      deadline_type: rule.deadline_type,
      rule_code: rule.rule_code,
      source: rule.source,
      exceptions: (rule.exceptions as DeadlineException[]) ?? [],
      note: `Beregnet fra regel ${rule.rule_code}.`,
    };
  });
}
