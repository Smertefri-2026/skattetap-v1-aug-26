import type { SupabaseClient } from "@supabase/supabase-js";
import { getClaimsWithStatus } from "./claimsWithStatus";

/** Upper bound on how many case summaries are sent into a single cross-case
 * AI call. Not a design limit on how many cases the engine can reason
 * about -- ranking + compression happen first specifically so this number
 * can be raised, or the selected batch processed in multiple passes with a
 * merge step, without changing how a single case is summarized or scored.
 * Kept as a plain named constant rather than hidden inside logic so it's
 * the one place to touch when that becomes necessary. */
export const MAX_CASES_FOR_CROSS_CASE_ANALYSIS = 25;

export interface CaseSummary {
  case_id: string;
  is_primary: boolean;
  title: string;
  description: string | null;
  tax_period: string | null;
  tax_type: string;
  outcome: string;
  total_amount_kr: number;
  documented_claim_count: number;
  undocumented_claim_count: number;
  conflicting_claim_count: number;
  top_documented_facts: string[];
  key_gaps: string[];
  applicable_rules: { rule_code: string; law_reference: string; provision: string; short_explanation: string }[];
  has_komplett_sak_analysis: boolean;
  relevance_score: number;
}

/** Deterministic, no AI call -- this is compression, not judgment, and has
 * to stay cheap since it runs once per case regardless of how many the
 * user has. Exported for direct testing of the amount-precedence logic. */
export async function summarizeCase(
  supabase: SupabaseClient,
  caseRow: {
    id: string;
    title: string;
    description: string | null;
    tax_period: string | null;
    tax_type: string;
    amount_kr: number | null;
    outcome: string;
  },
  isPrimary: boolean
): Promise<CaseSummary> {
  const [claims, { data: latestKomplettSak }, { data: gaps }] = await Promise.all([
    getClaimsWithStatus(supabase, caseRow.id),
    supabase
      .from("reports")
      .select("content")
      .eq("case_id", caseRow.id)
      .eq("type", "komplett-sak")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("documentation_gaps")
      .select("description")
      .eq("case_id", caseRow.id)
      .eq("status", "open")
      .limit(5),
  ]);

  const documented = claims.filter((c) => c.status === "documented");
  const undocumented = claims.filter((c) => c.status === "undocumented");
  const conflicting = claims.filter((c) => c.status === "conflicting");

  const komplettSakContent = latestKomplettSak?.content as
    | {
        strongest_points?: string[];
        weakest_points?: string[];
        financial_summary?: { total_amount_kr?: number };
        applicable_rules?: CaseSummary["applicable_rules"];
      }
    | undefined;

  return {
    case_id: caseRow.id,
    is_primary: isPrimary,
    title: caseRow.title,
    description: caseRow.description,
    tax_period: caseRow.tax_period,
    tax_type: caseRow.tax_type,
    outcome: caseRow.outcome,
    // The user's own stated amount (from Enkel sjekk) is preferred over the
    // Komplett sak-derived document total: the two aren't the same
    // quantity (document totals can include unrelated figures like salary,
    // and are legitimately 0 when a document simply doesn't mention an
    // amount), and unlike the derived figure the user's estimate is
    // consistently available across cases regardless of whether a Komplett
    // sak analysis exists yet.
    total_amount_kr: caseRow.amount_kr ?? komplettSakContent?.financial_summary?.total_amount_kr ?? 0,
    documented_claim_count: documented.length,
    undocumented_claim_count: undocumented.length,
    conflicting_claim_count: conflicting.length,
    top_documented_facts: komplettSakContent?.strongest_points?.slice(0, 4) ??
      documented.slice(0, 4).map((c) => c.statement),
    key_gaps: komplettSakContent?.weakest_points?.slice(0, 4) ?? (gaps ?? []).map((g) => g.description),
    applicable_rules: komplettSakContent?.applicable_rules ?? [],
    has_komplett_sak_analysis: !!latestKomplettSak,
    relevance_score: 0,
  };
}

export function parseYear(period: string | null): number | null {
  if (!period) return null;
  const match = period.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

/** Heuristic, deterministic, documented as a starting point -- same tax
 * type and nearby years matter most for pattern-finding; cases that
 * already show conflicts or real documentation are more informative than
 * empty ones. Not tuned on real usage data yet. Exported for direct
 * testing of the ranking logic without needing to fake a full Supabase
 * client. */
export function scoreRelevance(summary: CaseSummary, primary: CaseSummary): number {
  let score = 0;
  if (summary.tax_type === primary.tax_type) score += 3;

  const summaryYear = parseYear(summary.tax_period);
  const primaryYear = parseYear(primary.tax_period);
  if (summaryYear != null && primaryYear != null) {
    score += Math.max(0, 3 - Math.abs(summaryYear - primaryYear));
  }

  if (summary.conflicting_claim_count > 0) score += 1;
  if (summary.documented_claim_count > 0) score += 1;

  return score;
}

/** Builds a summary for every case the user owns, ranks the non-primary
 * ones by relevance to the primary case, and returns the primary case plus
 * the top-ranked others up to `limit`. The primary case is always
 * included and always first. */
export async function buildRankedCaseSummaries(
  supabase: SupabaseClient,
  userId: string,
  primaryCaseId: string,
  limit: number = MAX_CASES_FOR_CROSS_CASE_ANALYSIS
): Promise<CaseSummary[]> {
  const { data: allCases } = await supabase
    .from("cases")
    .select("id, title, description, tax_period, tax_type, amount_kr, outcome")
    .eq("user_id", userId);

  const rows = allCases ?? [];
  const primaryRow = rows.find((c) => c.id === primaryCaseId);
  if (!primaryRow) throw new Error("Fant ikke saken.");

  const primarySummary = await summarizeCase(supabase, primaryRow, true);
  const otherRows = rows.filter((c) => c.id !== primaryCaseId);
  const otherSummaries = await Promise.all(
    otherRows.map((row) => summarizeCase(supabase, row, false))
  );

  const scored = otherSummaries
    .map((s) => ({ ...s, relevance_score: scoreRelevance(s, primarySummary) }))
    .sort((a, b) => b.relevance_score - a.relevance_score);

  return [primarySummary, ...scored.slice(0, Math.max(0, limit - 1))];
}
