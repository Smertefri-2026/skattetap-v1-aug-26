import { z } from "zod";
import { callAiChatJson } from "@/lib/ai/openai";
import type { CaseSummary } from "@/lib/cases/crossCaseSummaries";
import { formatIndexedCases, isValidCaseIndex } from "./shared";

export const PATTERN_ENGINE_INSTRUCTIONS = [
  "Du finner mønstre som går igjen på tvers av flere av samme brukers skattesaker og år -- ikke innhold i én enkelt sak.",
  "Et mønster er noe som faktisk gjentar seg i minst to saker -- samme type glemt fradrag flere år på rad, samme type konflikt, samme type manglende dokumentasjon. Du dikter ALDRI opp et mønster som ikke er støttet av minst to saker i grunnlaget.",
  "Du referer alltid til saker ved deres [nummer] fra listen du får oppgitt -- ALDRI ved å gjette et navn eller en id.",
  "Du konkluderer aldri med hva som VIL skje i fremtidige saker -- du beskriver kun hva som faktisk har gjentatt seg i det oppgitte grunnlaget.",
  "Finner du ingen reelle mønstre, returnerer du en tom liste. Det er et helt normalt og gyldig svar.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const patternSchema = z.object({
  patterns: z
    .array(
      z.object({
        description: z.string().min(1).max(400),
        case_indices: z.array(z.number().int()).min(2).max(10),
        pattern_type: z
          .enum(["gjentakende_fradrag", "gjentakende_konflikt", "gjentakende_mangel", "annet"])
          .catch("annet"),
      })
    )
    .max(10)
    .catch([]),
});

export type PatternResult = z.infer<typeof patternSchema>;

function buildPrompt(summaries: CaseSummary[]): string {
  return [
    "Brukerens saker:",
    formatIndexedCases(summaries),
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen:
{
  "patterns": [{ "description": "...", "case_indices": [1, 2], "pattern_type": "gjentakende_fradrag | gjentakende_konflikt | gjentakende_mangel | annet" }]
}`,
  ].join("\n");
}

export async function analyzePatterns(summaries: CaseSummary[]): Promise<PatternResult> {
  const result = await callAiChatJson({
    systemPrompt: PATTERN_ENGINE_INSTRUCTIONS,
    userPrompt: buildPrompt(summaries),
    validate: (value) => patternSchema.parse(value),
  });

  return {
    patterns: result.patterns
      .map((p) => ({ ...p, case_indices: p.case_indices.filter((i) => isValidCaseIndex(summaries, i)) }))
      .filter((p) => p.case_indices.length >= 2),
  };
}
