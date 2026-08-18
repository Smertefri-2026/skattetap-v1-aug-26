import { z } from "zod";
import { callAiChatJson } from "@/lib/ai/openai";
import type { CaseSummary } from "@/lib/cases/crossCaseSummaries";
import { formatIndexedCases, isValidCaseIndex } from "./shared";

export const COMPARISON_ENGINE_INSTRUCTIONS = [
  "Du sammenligner flere av samme brukers skattesaker strukturert -- fakta, beløp, dokumentasjonsstyrke og tidligere vurderinger/utfall.",
  "Hver sammenligning skal si noe KONKRET om forskjellen eller likheten mellom de nevnte sakene -- ikke en generisk observasjon som kunne gjelde alle saker.",
  "Du dikter aldri opp tall eller fakta som ikke er oppgitt i grunnlaget.",
  "Du referer alltid til saker ved deres [nummer] fra listen du får oppgitt.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const comparisonSchema = z.object({
  comparisons: z
    .array(
      z.object({
        dimension: z.enum(["belop", "dokumentasjon", "utfall", "fakta"]).catch("fakta"),
        description: z.string().min(1).max(400),
        case_indices: z.array(z.number().int()).min(2).max(10),
      })
    )
    .max(12)
    .catch([]),
});

export type ComparisonResult = z.infer<typeof comparisonSchema>;

function buildPrompt(summaries: CaseSummary[]): string {
  return [
    "Brukerens saker:",
    formatIndexedCases(summaries),
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen:
{
  "comparisons": [{ "dimension": "belop | dokumentasjon | utfall | fakta", "description": "...", "case_indices": [1, 2] }]
}`,
  ].join("\n");
}

export async function analyzeComparisons(summaries: CaseSummary[]): Promise<ComparisonResult> {
  const result = await callAiChatJson({
    systemPrompt: COMPARISON_ENGINE_INSTRUCTIONS,
    userPrompt: buildPrompt(summaries),
    validate: (value) => comparisonSchema.parse(value),
  });

  return {
    comparisons: result.comparisons
      .map((c) => ({ ...c, case_indices: c.case_indices.filter((i) => isValidCaseIndex(summaries, i)) }))
      .filter((c) => c.case_indices.length >= 2),
  };
}
