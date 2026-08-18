import { z } from "zod";
import { callAiChatJson, wrapUntrustedContent } from "@/lib/ai/openai";

export const STRATEGIC_SYNTHESIS_INSTRUCTIONS = [
  "Du skriver den avsluttende, strategiske syntesen av en Komplett sak-analyse i Skattetap. Kronologi, konflikter, faktastyrke, dokumentasjonshull og skatterettslig vurdering er allerede utført av andre motorer og gitt deg som fasit -- du dikter ALDRI opp nye fakta.",
  "alternative_scenarios brukes KUN når saken faktisk er tvetydig -- beskriv ulike måter de dokumenterte fakta kan forstås eller argumenteres på. Dette er ALDRI en prediksjon av hva Skatteetaten vil konkludere med, kun mulige tolkninger av det som foreligger. Er saken entydig, returner en tom liste.",
  "strongest_points og weakest_points skal bygge direkte på faktastyrken og konfliktene du får oppgitt -- ikke egne nye vurderinger.",
  "ai_assessment er en generell KI-syntese, tydelig atskilt fra den skatterettslige vurderingen du fikk oppgitt -- du gjentar ikke den skatterettslige vurderingen, du oppsummerer hva helheten betyr for brukeren.",
  "Du garanterer aldri et utfall og gir aldri en juridisk konklusjon.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const strategicSynthesisSchema = z.object({
  case_summary: z.string().min(1).max(1000),
  alternative_scenarios: z
    .array(z.object({ scenario: z.string().min(1).max(400), note: z.string().min(1).max(300) }))
    .max(5)
    .catch([]),
  strongest_points: z.array(z.string().max(200)).max(6).catch([]),
  weakest_points: z.array(z.string().max(200)).max(6).catch([]),
  ai_assessment: z.string().min(1).max(1500),
  recommended_next_steps: z.array(z.string().max(200)).max(8).catch([]),
});

export type StrategicSynthesisResult = z.infer<typeof strategicSynthesisSchema>;

export interface StrategicSynthesisInput {
  caseTitle: string;
  description: string | null;
  chronologySummary: string[];
  conflictSummary: string[];
  factStrengthSummary: string[];
  documentationGapsSummary: string[];
  legalAssessment: string;
  financialImpactNote: string;
  skatteetatenContext: string | null;
}

function buildPrompt(input: StrategicSynthesisInput): string {
  return [
    `Sak: ${input.caseTitle}`,
    "",
    wrapUntrustedContent("Brukerens forklaring:", input.description ?? "(ingen)"),
    "",
    "Kronologi (fra kronologi-/konfliktmotoren):",
    ...(input.chronologySummary.length ? input.chronologySummary : ["(ingen)"]),
    "",
    "Konflikter identifisert:",
    ...(input.conflictSummary.length ? input.conflictSummary : ["(ingen)"]),
    "",
    "Faktastyrke:",
    ...(input.factStrengthSummary.length ? input.factStrengthSummary : ["(ikke vurdert)"]),
    "",
    "Dokumentasjonshull:",
    ...(input.documentationGapsSummary.length ? input.documentationGapsSummary : ["(ingen)"]),
    "",
    `Skatterettslig vurdering (fra regelverksmotoren): ${input.legalAssessment}`,
    "",
    `Økonomisk betydning: ${input.financialImpactNote}`,
    "",
    input.skatteetatenContext
      ? `Tidligere svar fra Skatteetaten: ${input.skatteetatenContext}`
      : "Ingen svar fra Skatteetaten er mottatt i saken ennå.",
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen:
{
  "case_summary": "...",
  "alternative_scenarios": [{ "scenario": "...", "note": "..." }],
  "strongest_points": ["..."],
  "weakest_points": ["..."],
  "ai_assessment": "...",
  "recommended_next_steps": ["..."]
}`,
  ].join("\n");
}

export async function analyzeStrategicSynthesis(
  input: StrategicSynthesisInput
): Promise<StrategicSynthesisResult> {
  return callAiChatJson({
    systemPrompt: STRATEGIC_SYNTHESIS_INSTRUCTIONS,
    userPrompt: buildPrompt(input),
    validate: (value) => strategicSynthesisSchema.parse(value),
  });
}
