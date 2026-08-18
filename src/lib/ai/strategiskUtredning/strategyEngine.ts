import { z } from "zod";
import { callAiChatJson, wrapUntrustedContent } from "@/lib/ai/openai";
import type { CaseSummary } from "@/lib/cases/crossCaseSummaries";
import { formatIndexedCases } from "./shared";

export const STRATEGY_ENGINE_INSTRUCTIONS = [
  "Du foreslår alternative strategier for hvordan brukeren kan gå videre med sakene sine samlet -- ALDRI én anbefalt fremgangsmåte fremstilt som riktig.",
  "Du foreslår ALLTID minst to reelt forskjellige strategier, selv når grunnlaget er usikkert eller peker i én retning -- usikkerhet beskrives da i risks/weaknesses for den strategien, det er ALDRI en grunn til å bare presentere én.",
  "Hver strategi skal ha egne styrker, svakheter, risikoer og konsekvenser -- disse skal være konkrete og knyttet til DE FAKTISKE sakene, ikke generiske fordeler/ulemper som kunne stått under enhver strategi.",
  "Du garanterer aldri et utfall eller sier at én strategi 'vil' lykkes -- du beskriver kun hva som taler for og imot.",
  "Du referer til saker ved deres [nummer] fra listen du får oppgitt der det er relevant.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const strategySchema = z.object({
  strategies: z
    .array(
      z.object({
        name: z.string().min(1).max(150),
        description: z.string().min(1).max(500),
        relevant_case_indices: z.array(z.number().int()).max(10).catch([]),
        strengths: z.array(z.string().max(250)).max(6).catch([]),
        weaknesses: z.array(z.string().max(250)).max(6).catch([]),
        risks: z.array(z.string().max(250)).max(6).catch([]),
        consequences: z.array(z.string().max(250)).max(6).catch([]),
      })
    )
    .min(2)
    .catch([]),
});

export type StrategyResult = z.infer<typeof strategySchema>;

export interface StrategyEngineInput {
  patternSummaries: string[];
  comparisonSummaries: string[];
  financialExposureNote: string;
  deadlineSummaries: string[];
  summaries: CaseSummary[];
}

function buildPrompt(input: StrategyEngineInput): string {
  return [
    "Brukerens saker:",
    formatIndexedCases(input.summaries),
    "",
    "Identifiserte mønstre:",
    ...(input.patternSummaries.length ? input.patternSummaries : ["(ingen)"]),
    "",
    "Sammenligninger:",
    ...(input.comparisonSummaries.length ? input.comparisonSummaries : ["(ingen)"]),
    "",
    `Samlet økonomisk eksponering: ${input.financialExposureNote}`,
    "",
    "Fristvurdering per sak:",
    ...(input.deadlineSummaries.length ? input.deadlineSummaries : ["(ikke vurdert)"]),
    "",
    wrapUntrustedContent(
      "Merk",
      "Grunnlaget over kan være ufullstendig eller usikkert i deler -- reflekter dette i strategienes risks/weaknesses fremfor å utelate strategier."
    ),
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen (minst to strategier):
{
  "strategies": [{
    "name": "kort navn på strategien",
    "description": "...",
    "relevant_case_indices": [1, 2],
    "strengths": ["..."],
    "weaknesses": ["..."],
    "risks": ["..."],
    "consequences": ["..."]
  }]
}`,
  ].join("\n");
}

export async function analyzeStrategies(input: StrategyEngineInput): Promise<StrategyResult> {
  const result = await callAiChatJson({
    systemPrompt: STRATEGY_ENGINE_INSTRUCTIONS,
    userPrompt: buildPrompt(input),
    validate: (value) => strategySchema.parse(value),
  });

  return {
    strategies: result.strategies.map((s) => ({
      ...s,
      relevant_case_indices: s.relevant_case_indices.filter((i) => i >= 1 && i <= input.summaries.length),
    })),
  };
}
