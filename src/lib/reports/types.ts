export interface RuleReference {
  rule_code: string;
  law_reference: string;
  provision: string;
  short_explanation: string;
}

export interface FullCheckReportContent {
  summary: string;
  background: string;
  documented_facts: { statement: string; reasoning: string }[];
  uncertain_or_missing: { statement: string; reasoning: string }[];
  conflicting_information: string[];
  timeline: { date: string; label: string }[];
  parties: string[];
  amounts: { label: string; amount_kr: number }[];
  applicable_rules: RuleReference[];
  assessment: string;
  documentation_gaps: string[];
  recommended_next_steps: string[];
}

export interface SkatteendringReportContent {
  proposal_text: string;
  reasoning: string;
  referenced_documents: { document_id: string; filename: string; relevance: string }[];
  attachments: string[];
  missing_information: string[];
  applicable_rules: RuleReference[];
}

export interface ChangesSinceLast {
  has_previous: boolean;
  previous_generated_at: string | null;
  new_documents: string[];
  new_gaps: string[];
  resolved_gaps: string[];
  new_conflicts: string[];
  changed_assessments: string[];
}

export interface KomplettSakReportContent {
  changes_since_last: ChangesSinceLast;
  case_summary: string;
  user_explanation: string | null;
  chronology: {
    date: string | null;
    description: string;
    source_type: "documented" | "user_explanation" | "ai_inference";
  }[];
  fact_strength: {
    statement: string;
    strength: "strong" | "weak" | "conflicting";
    reasoning: string;
  }[];
  conflicts: {
    statements: string[];
    description: string;
    severity: "high" | "medium" | "low";
  }[];
  documentation_gaps: {
    description: string;
    suggested_action: string;
    related_statement: string | null;
  }[];
  financial_summary: {
    total_amount_kr: number;
    breakdown: { label: string; amount_kr: number }[];
    impact_note: string;
  };
  claim_rule_links: { statement: string; rules: RuleReference[] }[];
  applicable_rules: RuleReference[];
  skatteetaten_context: string | null;
  alternative_scenarios: { scenario: string; note: string }[];
  strongest_points: string[];
  weakest_points: string[];
  legal_assessment: string;
  ai_assessment: string;
  recommended_next_steps: string[];
}

export type ReportContent =
  | FullCheckReportContent
  | SkatteendringReportContent
  | KomplettSakReportContent;

export interface Report<T extends ReportContent = FullCheckReportContent> {
  id: string;
  case_id: string;
  type: "full-sjekk" | "skatteendring" | "komplett-sak";
  content: T;
  model: string;
  created_at: string;
}
