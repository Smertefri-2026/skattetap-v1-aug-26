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

export interface DeadlineAssessmentSummary {
  case_title: string;
  status: "vurdert" | "ikke_vurdert";
  deadline_date: string | null;
  deadline_type: string | null;
  source: string | null;
  exceptions: { condition: string; effect: string }[];
  note: string;
}

export interface StrategiskUtredningReportContent {
  included_cases: {
    case_id: string;
    title: string;
    tax_period: string | null;
    tax_type: string;
    is_primary: boolean;
  }[];
  user_explanations: { case_title: string; explanation: string }[];
  documented_facts_overview: { case_title: string; facts: string[] }[];
  documentation_gaps_overview: { case_title: string; gaps: string[] }[];
  patterns: { description: string; case_titles: string[]; pattern_type: string }[];
  comparisons: { dimension: string; description: string; case_titles: string[] }[];
  deadlines: DeadlineAssessmentSummary[];
  financial_exposure: {
    total_amount_kr: number;
    breakdown_by_case: { case_title: string; amount_kr: number }[];
  };
  applicable_rules: RuleReference[];
  strategies: {
    name: string;
    description: string;
    relevant_cases: string[];
    strengths: string[];
    weaknesses: string[];
    risks: string[];
    consequences: string[];
  }[];
  overall_assessment: string;
  prioritized_cases: { case_title: string; reasoning: string }[];
  assumptions: string[];
  recommended_next_steps: string[];
}

export type ReportContent =
  | FullCheckReportContent
  | SkatteendringReportContent
  | KomplettSakReportContent
  | StrategiskUtredningReportContent;

export interface Report<T extends ReportContent = FullCheckReportContent> {
  id: string;
  case_id: string;
  type: "full-sjekk" | "skatteendring" | "komplett-sak" | "strategisk-utredning";
  content: T;
  model: string;
  created_at: string;
}
