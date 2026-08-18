import { z } from "zod";
import { callAiChatJson } from "@/lib/ai/openai";
import { formatIndexedClaims, isValidClaimIndex, type IndexedClaim } from "./shared";

export const GAPS_FINANCIALS_INSTRUCTIONS = [
  "Du identifiserer konkrete dokumentasjonshull i en skattesak og forklarer den økonomiske betydningen av allerede oppgitte beløp.",
  "documentation_gaps skal være konkrete og knyttet til DENNE saken -- aldri en generisk sjekkliste. suggested_action skal si presist hva brukeren bør gjøre for å tette hullet (f.eks. 'be arbeidsgiver om reiseregning for august-desember 2023', ikke bare 'skaff mer dokumentasjon').",
  "Du regner ALDRI ut summer selv -- de er allerede beregnet og gitt deg. Du skriver kun en forklarende tekst om hva beløpene faktisk betyr for saken.",
  "Du dikter ikke opp beløp eller mangler som ikke har grunnlag i det du får oppgitt.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const gapsFinancialsSchema = z.object({
  documentation_gaps: z
    .array(
      z.object({
        description: z.string().min(1).max(300),
        suggested_action: z.string().min(1).max(300),
        related_claim_index: z.number().int().nullable().catch(null),
      })
    )
    .max(10)
    .catch([]),
  financial_impact_note: z.string().min(1).max(800),
});

export type GapsFinancialsResult = z.infer<typeof gapsFinancialsSchema>;

export interface GapsFinancialsInput {
  caseTitle: string;
  claims: IndexedClaim[];
  totalAmountKr: number;
  amountBreakdown: { label: string; amount_kr: number }[];
}

function buildPrompt(input: GapsFinancialsInput): string {
  return [
    `Sak: ${input.caseTitle}`,
    "",
    "Fakta/påstander i saken:",
    formatIndexedClaims(input.claims),
    "",
    `Samlet identifisert beløp: ${input.totalAmountKr} kr`,
    "Fordeling:",
    ...(input.amountBreakdown.length
      ? input.amountBreakdown.map((a) => `- ${a.label}: ${a.amount_kr} kr`)
      : ["(ingen beløp identifisert ennå)"]),
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen:
{
  "documentation_gaps": [{ "description": "...", "suggested_action": "...", "related_claim_index": 1 }],
  "financial_impact_note": "forklaring av hva beløpene betyr for saken"
}`,
  ].join("\n");
}

export async function analyzeGapsAndFinancials(
  input: GapsFinancialsInput
): Promise<GapsFinancialsResult> {
  const result = await callAiChatJson({
    systemPrompt: GAPS_FINANCIALS_INSTRUCTIONS,
    userPrompt: buildPrompt(input),
    validate: (value) => gapsFinancialsSchema.parse(value),
  });

  return {
    ...result,
    documentation_gaps: result.documentation_gaps.map((g) => ({
      ...g,
      related_claim_index:
        g.related_claim_index != null && isValidClaimIndex(input.claims, g.related_claim_index)
          ? g.related_claim_index
          : null,
    })),
  };
}
