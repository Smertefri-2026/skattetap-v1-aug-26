import { z } from "zod";
import { callAiChatJson } from "@/lib/ai/openai";
import type { CaseSummary } from "@/lib/cases/crossCaseSummaries";
import { formatIndexedCases, isValidCaseIndex } from "./shared";

export const SYNTHESIS_ENGINE_INSTRUCTIONS = [
  "Du skriver den avsluttende strategiske vurderingen i en Strategisk utredning. Mønstre, sammenligninger, strategier, frister og økonomisk eksponering er allerede utført av andre motorer og gitt deg som fasit -- du dikter ALDRI opp nye fakta.",
  "overall_assessment er en generell KI-syntese -- tydelig atskilt fra enhver skatterettslig vurdering. Du garanterer aldri et utfall.",
  "prioritized_cases skal forklare HVORFOR en sak bør prioriteres (frist som nærmer seg, sterkt dokumentert grunnlag, høyt beløp, e.l.) -- aldri bare en rangert liste uten begrunnelse.",
  "assumptions skal liste eventuelle antakelser DENNE syntesen bygger på (f.eks. at ingen frist er vurdert for en sak) -- tydelig atskilt fra det som faktisk er dokumentert.",
  "Du referer til saker ved deres [nummer] fra listen du får oppgitt.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const synthesisSchema = z.object({
  overall_assessment: z.string().min(1).max(1500),
  prioritized_cases: z
    .array(z.object({ case_index: z.number().int(), reasoning: z.string().min(1).max(300) }))
    .max(20)
    .catch([]),
  assumptions: z.array(z.string().max(250)).max(8).catch([]),
  recommended_next_steps: z.array(z.string().max(250)).max(10).catch([]),
});

export type SynthesisResult = z.infer<typeof synthesisSchema>;

export interface SynthesisEngineInput {
  summaries: CaseSummary[];
  patternSummaries: string[];
  comparisonSummaries: string[];
  strategyNames: string[];
  financialExposureNote: string;
  deadlineSummaries: string[];
}

function buildPrompt(input: SynthesisEngineInput): string {
  return [
    "Brukerens saker:",
    formatIndexedCases(input.summaries),
    "",
    "Mønstre:",
    ...(input.patternSummaries.length ? input.patternSummaries : ["(ingen)"]),
    "",
    "Sammenligninger:",
    ...(input.comparisonSummaries.length ? input.comparisonSummaries : ["(ingen)"]),
    "",
    `Foreslåtte strategier: ${input.strategyNames.join(", ") || "ingen"}`,
    "",
    `Samlet økonomisk eksponering: ${input.financialExposureNote}`,
    "",
    "Fristvurdering per sak:",
    ...(input.deadlineSummaries.length ? input.deadlineSummaries : ["(ikke vurdert)"]),
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen:
{
  "overall_assessment": "...",
  "prioritized_cases": [{ "case_index": 1, "reasoning": "..." }],
  "assumptions": ["..."],
  "recommended_next_steps": ["..."]
}`,
  ].join("\n");
}

export async function analyzeSynthesis(input: SynthesisEngineInput): Promise<SynthesisResult> {
  const result = await callAiChatJson({
    systemPrompt: SYNTHESIS_ENGINE_INSTRUCTIONS,
    userPrompt: buildPrompt(input),
    validate: (value) => synthesisSchema.parse(value),
  });

  return {
    ...result,
    prioritized_cases: result.prioritized_cases.filter((p) => isValidCaseIndex(input.summaries, p.case_index)),
  };
}
