import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeChronologyAndConflicts } from "@/lib/ai/komplettSak/chronologyAndConflicts";
import { analyzeGapsAndFinancials } from "@/lib/ai/komplettSak/gapsAndFinancials";
import { analyzeLegalLinking } from "@/lib/ai/komplettSak/legalLinking";
import { analyzeStrategicSynthesis } from "@/lib/ai/komplettSak/strategicSynthesis";
import { indexClaims, type IndexedClaim } from "@/lib/ai/komplettSak/shared";
import { getCaseFacts } from "@/lib/cases/caseFacts";
import { getClaimsWithStatus } from "@/lib/cases/claimsWithStatus";
import type { KomplettSakReportContent, Report, RuleReference } from "./types";

const MODEL = "gpt-4.1-mini";

function statementFor(claims: IndexedClaim[], index: number): string {
  return claims.find((c) => c.index === index)?.statement ?? "(ukjent faktum)";
}

export async function buildKomplettSakReport(
  supabase: SupabaseClient,
  caseId: string
): Promise<Report<KomplettSakReportContent>> {
  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("id, title, description")
    .eq("id", caseId)
    .single();
  if (caseError || !caseRow) throw new Error("Fant ikke saken.");

  const [claimsWithStatus, facts, { data: documents }, { data: taxRules }, { data: latestResponse }] =
    await Promise.all([
      getClaimsWithStatus(supabase, caseId),
      getCaseFacts(supabase, caseId),
      supabase.from("documents").select("id, original_filename, ai_extraction").eq("case_id", caseId),
      supabase.from("tax_rules").select("*"),
      supabase
        .from("skatteetaten_responses")
        .select("interpretation")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const claims = indexClaims(
    claimsWithStatus.map((c) => ({ statement: c.statement, origin: c.origin, status: c.status }))
  );
  const claimIdByIndex = new Map(claims.map((c) => [c.index, claimsWithStatus[c.index - 1]?.id]));

  const documentSummaries = (documents ?? []).map((d) => {
    const ex = d.ai_extraction as { document_type?: string; document_date?: string } | null;
    return `${d.original_filename}${ex?.document_type ? ` (${ex.document_type}` : ""}${
      ex?.document_date ? `, ${ex.document_date})` : ex?.document_type ? ")" : ""
    }`;
  });

  const totalAmountKr = facts.amounts.reduce((sum, a) => sum + a.amount_kr, 0);
  const amountBreakdown = facts.amounts.map((a) => ({ label: a.label, amount_kr: a.amount_kr }));

  const skatteetatenContext = latestResponse?.interpretation
    ? (latestResponse.interpretation as { summary_plain_language?: string }).summary_plain_language ?? null
    : null;

  // Engine 1-3 run independently -- each answers a distinct question of the
  // same underlying facts, not sequential steps of one another.
  const [chronologyConflicts, gapsFinancials, legalLinking] = await Promise.all([
    analyzeChronologyAndConflicts({
      caseTitle: caseRow.title,
      description: caseRow.description,
      claims,
      documentSummaries,
    }),
    analyzeGapsAndFinancials({
      caseTitle: caseRow.title,
      claims,
      totalAmountKr,
      amountBreakdown,
    }),
    analyzeLegalLinking({
      caseTitle: caseRow.title,
      claims,
      availableRules: (taxRules ?? []).map((r) => ({
        rule_code: r.rule_code,
        topic: r.topic,
        short_explanation: r.short_explanation,
      })),
    }),
  ]);

  // Conflicts are real evidentiary events -- each gets its own versioned
  // assessment per claim involved, never overwriting the claim's prior
  // (e.g. "documented") assessment.
  for (const conflict of chronologyConflicts.conflicts) {
    for (const index of conflict.claim_indices) {
      const claimId = claimIdByIndex.get(index);
      if (!claimId) continue;
      await supabase.from("claim_assessments").insert({
        claim_id: claimId,
        status: "conflicting",
        reasoning: conflict.description,
        assessed_by: "ai",
      });
    }
  }

  if (gapsFinancials.documentation_gaps.length > 0) {
    await supabase.from("documentation_gaps").insert(
      gapsFinancials.documentation_gaps.map((g) => ({
        case_id: caseId,
        claim_id: g.related_claim_index != null ? claimIdByIndex.get(g.related_claim_index) ?? null : null,
        description: g.description,
        suggested_action: g.suggested_action,
      }))
    );
  }

  const rulesByCode = new Map((taxRules ?? []).map((r) => [r.rule_code, r as RuleReference]));
  const claimRuleLinks = legalLinking.claim_rule_links.map((l) => ({
    statement: statementFor(claims, l.claim_index),
    rules: l.rule_codes.map((code) => rulesByCode.get(code)).filter((r): r is RuleReference => !!r),
  }));
  const applicableRules = [...new Map(claimRuleLinks.flatMap((l) => l.rules).map((r) => [r.rule_code, r])).values()];

  const synthesis = await analyzeStrategicSynthesis({
    caseTitle: caseRow.title,
    description: caseRow.description,
    chronologySummary: chronologyConflicts.chronology.map(
      (c) => `${c.date ?? "udatert"} -- ${c.description} (${c.source_type})`
    ),
    conflictSummary: chronologyConflicts.conflicts.map((c) => c.description),
    factStrengthSummary: chronologyConflicts.fact_strength.map(
      (f) => `${statementFor(claims, f.claim_index)}: ${f.strength} (${f.reasoning})`
    ),
    documentationGapsSummary: gapsFinancials.documentation_gaps.map((g) => g.description),
    legalAssessment: legalLinking.legal_assessment,
    financialImpactNote: gapsFinancials.financial_impact_note,
    skatteetatenContext,
  });

  const content: KomplettSakReportContent = {
    case_summary: synthesis.case_summary,
    user_explanation: caseRow.description,
    chronology: chronologyConflicts.chronology,
    fact_strength: chronologyConflicts.fact_strength.map((f) => ({
      statement: statementFor(claims, f.claim_index),
      strength: f.strength,
      reasoning: f.reasoning,
    })),
    conflicts: chronologyConflicts.conflicts.map((c) => ({
      statements: c.claim_indices.map((i) => statementFor(claims, i)),
      description: c.description,
      severity: c.severity,
    })),
    documentation_gaps: gapsFinancials.documentation_gaps.map((g) => ({
      description: g.description,
      suggested_action: g.suggested_action,
      related_statement: g.related_claim_index != null ? statementFor(claims, g.related_claim_index) : null,
    })),
    financial_summary: {
      total_amount_kr: totalAmountKr,
      breakdown: amountBreakdown,
      impact_note: gapsFinancials.financial_impact_note,
    },
    claim_rule_links: claimRuleLinks,
    applicable_rules: applicableRules,
    skatteetaten_context: skatteetatenContext,
    alternative_scenarios: synthesis.alternative_scenarios,
    strongest_points: synthesis.strongest_points,
    weakest_points: synthesis.weakest_points,
    legal_assessment: legalLinking.legal_assessment,
    ai_assessment: synthesis.ai_assessment,
    recommended_next_steps: synthesis.recommended_next_steps,
  };

  const { data: report, error: insertError } = await supabase
    .from("reports")
    .insert({ case_id: caseId, type: "komplett-sak", content, model: MODEL })
    .select("*")
    .single();
  if (insertError || !report) throw new Error("Kunne ikke lagre den komplette saksmappen.");

  return report as Report<KomplettSakReportContent>;
}
