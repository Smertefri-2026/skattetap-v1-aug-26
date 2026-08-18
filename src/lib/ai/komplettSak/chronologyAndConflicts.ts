import { z } from "zod";
import { callAiChatJson, wrapUntrustedContent } from "@/lib/ai/openai";
import { formatIndexedClaims, isValidClaimIndex, type IndexedClaim } from "./shared";

export const CHRONOLOGY_CONFLICTS_INSTRUCTIONS = [
  "Du er motoren i Skattetap som bygger en samlet kronologi og oppdager motsigelser på tvers av ALLE fakta og dokumenter i en sak -- ikke bare ett dokument om gangen.",
  "chronology skal flettes sammen fra dokumenterte datoer OG brukerens egen fremstilling. Merk hver hendelse med source_type: 'documented' når den kommer direkte fra et dokument, 'user_explanation' når den kommer fra brukerens egen forklaring, 'ai_inference' KUN når du selv har utledet en sammenheng som ikke står eksplisitt -- og da skal beskrivelsen tydelig vise at det er en utledning, f.eks. 'trolig samme hendelse som ...'.",
  "conflicts brukes KUN når to eller flere fakta faktisk motsier hverandre (ulike datoer for samme hendelse, ulike beløp for samme forhold, en påstand som strider mot et dokumentert forhold). Du dikter aldri opp en konflikt for å ha noe å rapportere -- finner du ingen, returner en tom liste.",
  "fact_strength vurderer HVERT faktum for seg: 'strong' når det er dokumentert av en klar kilde uten motsigelse, 'weak' når det er udokumentert eller kun løst antydet, 'conflicting' når det inngår i en registrert konflikt.",
  "Du referer alltid til fakta ved deres [nummer] fra listen du får oppgitt -- ALDRI ved å gjette en id eller gjendikte teksten.",
  "Du presenterer aldri en antakelse som et fastslått faktum.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const chronologyConflictsSchema = z.object({
  chronology: z
    .array(
      z.object({
        date: z.string().nullable().catch(null),
        description: z.string().min(1).max(300),
        source_type: z.enum(["documented", "user_explanation", "ai_inference"]).catch("ai_inference"),
      })
    )
    .max(20)
    .catch([]),
  conflicts: z
    .array(
      z.object({
        claim_indices: z.array(z.number().int()).min(2).max(6),
        description: z.string().min(1).max(400),
        severity: z.enum(["high", "medium", "low"]).catch("low"),
      })
    )
    .max(10)
    .catch([]),
  fact_strength: z
    .array(
      z.object({
        claim_index: z.number().int(),
        strength: z.enum(["strong", "weak", "conflicting"]).catch("weak"),
        reasoning: z.string().min(1).max(300),
      })
    )
    .max(30)
    .catch([]),
});

export type ChronologyConflictsResult = z.infer<typeof chronologyConflictsSchema>;

export interface ChronologyConflictsInput {
  caseTitle: string;
  description: string | null;
  claims: IndexedClaim[];
  documentSummaries: string[];
}

function buildPrompt(input: ChronologyConflictsInput): string {
  return [
    `Sak: ${input.caseTitle}`,
    "",
    wrapUntrustedContent("Brukerens forklaring:", input.description ?? "(ingen)"),
    "",
    "Fakta/påstander i saken:",
    formatIndexedClaims(input.claims),
    "",
    `Dokumenter i saken: ${input.documentSummaries.join("; ") || "ingen"}`,
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen:
{
  "chronology": [{ "date": "YYYY-MM-DD eller null", "description": "...", "source_type": "documented | user_explanation | ai_inference" }],
  "conflicts": [{ "claim_indices": [1, 2], "description": "...", "severity": "high | medium | low" }],
  "fact_strength": [{ "claim_index": 1, "strength": "strong | weak | conflicting", "reasoning": "..." }]
}`,
  ].join("\n");
}

export async function analyzeChronologyAndConflicts(
  input: ChronologyConflictsInput
): Promise<ChronologyConflictsResult> {
  const result = await callAiChatJson({
    systemPrompt: CHRONOLOGY_CONFLICTS_INSTRUCTIONS,
    userPrompt: buildPrompt(input),
    validate: (value) => chronologyConflictsSchema.parse(value),
  });

  return {
    ...result,
    conflicts: result.conflicts
      .map((c) => ({
        ...c,
        claim_indices: c.claim_indices.filter((i) => isValidClaimIndex(input.claims, i)),
      }))
      .filter((c) => c.claim_indices.length >= 2),
    fact_strength: result.fact_strength.filter((f) => isValidClaimIndex(input.claims, f.claim_index)),
  };
}
