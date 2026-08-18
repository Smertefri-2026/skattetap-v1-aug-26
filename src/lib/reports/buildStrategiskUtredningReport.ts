import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeComparisons } from "@/lib/ai/strategiskUtredning/comparisonEngine";
import { analyzePatterns } from "@/lib/ai/strategiskUtredning/patternEngine";
import { analyzeStrategies } from "@/lib/ai/strategiskUtredning/strategyEngine";
import { analyzeSynthesis } from "@/lib/ai/strategiskUtredning/synthesisEngine";
import { buildRankedCaseSummaries, type CaseSummary } from "@/lib/cases/crossCaseSummaries";
import { evaluateDeadlines } from "@/lib/deadlines/evaluateDeadlines";
import type {
  DeadlineAssessmentSummary,
  Report,
  RuleReference,
  StrategiskUtredningReportContent,
} from "./types";

const MODEL = "gpt-4.1-mini";

function titleFor(summaries: CaseSummary[], index: number): string {
  return summaries[index - 1]?.title ?? "(ukjent sak)";
}

function titlesFor(summaries: CaseSummary[], indices: number[]): string[] {
  return indices.map((i) => titleFor(summaries, i));
}

export async function buildStrategiskUtredningReport(
  supabase: SupabaseClient,
  caseId: string
): Promise<Report<StrategiskUtredningReportContent>> {
  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("id, user_id")
    .eq("id", caseId)
    .single();
  if (caseError || !caseRow) throw new Error("Fant ikke saken.");

  const summaries = await buildRankedCaseSummaries(supabase, caseRow.user_id, caseId);

  // Deterministic engines run first -- their output feeds the AI engines as
  // fasit, the same "code computes, AI narrates" split used throughout.
  const deadlineAssessments = await evaluateDeadlines(
    supabase,
    summaries.map((s) => ({ case_id: s.case_id, tax_type: s.tax_type, tax_period: s.tax_period }))
  );
  const deadlinesByCaseId = new Map(deadlineAssessments.map((d) => [d.case_id, d]));

  const totalAmountKr = summaries.reduce((sum, s) => sum + s.total_amount_kr, 0);
  const financialExposure = {
    total_amount_kr: totalAmountKr,
    breakdown_by_case: summaries
      .filter((s) => s.total_amount_kr > 0)
      .map((s) => ({ case_title: s.title, amount_kr: s.total_amount_kr })),
  };

  const deadlineSummaries: DeadlineAssessmentSummary[] = summaries.map((s) => {
    const d = deadlinesByCaseId.get(s.case_id);
    return {
      case_title: s.title,
      status: d?.status ?? "ikke_vurdert",
      deadline_date: d?.deadline_date ?? null,
      deadline_type: d?.deadline_type ?? null,
      source: d?.source ?? null,
      exceptions: d?.exceptions ?? [],
      note: d?.note ?? "Ingen kvalitetssikret fristregel funnet for denne sakstypen.",
    };
  });
  const deadlineSummaryLines = deadlineSummaries.map(
    (d) => `${d.case_title}: ${d.status === "vurdert" ? `${d.deadline_date} (${d.deadline_type})` : `ikke vurdert -- ${d.note}`}`
  );

  // Patterns and comparisons run independently -- both read the same case
  // summaries but answer different questions.
  const [patterns, comparisons] = await Promise.all([
    analyzePatterns(summaries),
    analyzeComparisons(summaries),
  ]);

  const patternLines = patterns.patterns.map(
    (p) => `${p.description} (${titlesFor(summaries, p.case_indices).join(", ")})`
  );
  const comparisonLines = comparisons.comparisons.map(
    (c) => `[${c.dimension}] ${c.description} (${titlesFor(summaries, c.case_indices).join(", ")})`
  );
  const financialExposureNote = `${totalAmountKr} kr samlet på tvers av ${summaries.length} sak(er).`;

  const strategies = await analyzeStrategies({
    patternSummaries: patternLines,
    comparisonSummaries: comparisonLines,
    financialExposureNote,
    deadlineSummaries: deadlineSummaryLines,
    summaries,
  });

  const synthesis = await analyzeSynthesis({
    summaries,
    patternSummaries: patternLines,
    comparisonSummaries: comparisonLines,
    strategyNames: strategies.strategies.map((s) => s.name),
    financialExposureNote,
    deadlineSummaries: deadlineSummaryLines,
  });

  const applicableRules = [
    ...new Map(summaries.flatMap((s) => s.applicable_rules).map((r) => [r.rule_code, r] as [string, RuleReference])).values(),
  ];

  const content: StrategiskUtredningReportContent = {
    included_cases: summaries.map((s) => ({
      case_id: s.case_id,
      title: s.title,
      tax_period: s.tax_period,
      tax_type: s.tax_type,
      is_primary: s.is_primary,
    })),
    user_explanations: summaries
      .filter((s) => !!s.description)
      .map((s) => ({ case_title: s.title, explanation: s.description as string })),
    documented_facts_overview: summaries
      .filter((s) => s.top_documented_facts.length > 0)
      .map((s) => ({ case_title: s.title, facts: s.top_documented_facts })),
    documentation_gaps_overview: summaries
      .filter((s) => s.key_gaps.length > 0)
      .map((s) => ({ case_title: s.title, gaps: s.key_gaps })),
    patterns: patterns.patterns.map((p) => ({
      description: p.description,
      case_titles: titlesFor(summaries, p.case_indices),
      pattern_type: p.pattern_type,
    })),
    comparisons: comparisons.comparisons.map((c) => ({
      dimension: c.dimension,
      description: c.description,
      case_titles: titlesFor(summaries, c.case_indices),
    })),
    deadlines: deadlineSummaries,
    financial_exposure: financialExposure,
    applicable_rules: applicableRules,
    strategies: strategies.strategies.map((s) => ({
      name: s.name,
      description: s.description,
      relevant_cases: titlesFor(summaries, s.relevant_case_indices),
      strengths: s.strengths,
      weaknesses: s.weaknesses,
      risks: s.risks,
      consequences: s.consequences,
    })),
    overall_assessment: synthesis.overall_assessment,
    prioritized_cases: synthesis.prioritized_cases.map((p) => ({
      case_title: titleFor(summaries, p.case_index),
      reasoning: p.reasoning,
    })),
    assumptions: synthesis.assumptions,
    recommended_next_steps: synthesis.recommended_next_steps,
  };

  const { data: report, error: insertError } = await supabase
    .from("reports")
    .insert({ case_id: caseId, type: "strategisk-utredning", content, model: MODEL })
    .select("*")
    .single();
  if (insertError || !report) throw new Error("Kunne ikke lagre den strategiske utredningen.");

  return report as Report<StrategiskUtredningReportContent>;
}
