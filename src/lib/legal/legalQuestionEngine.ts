import { z } from "zod";
import { defineAiEngine } from "@/lib/ai/engine";
import { wrapUntrustedContent } from "@/lib/ai/openai";
import { formatIndexedClaims, isValidClaimIndex, type IndexedClaim } from "@/lib/ai/komplettSak/shared";

export interface LegalQuestionCandidate {
  question: string;
  claimIndices: number[];
}

export interface LegalQuestionIdentificationInput {
  caseTitle: string;
  taxType: string;
  description: string | null;
  claims: IndexedClaim[];
}

export interface LegalQuestionIdentificationOutput {
  questions: LegalQuestionCandidate[];
}

const responseSchema = z
  .object({
    questions: z
      .array(
        z.object({
          question: z.string().min(1).max(300),
          claim_numbers: z.array(z.number().int()).max(10).catch([]),
        })
      )
      .max(5)
      .catch([]),
  })
  .transform((raw) => ({
    questions: raw.questions.map((q) => ({ question: q.question, claimIndices: q.claim_numbers })),
  }));

// Documents give us facts, legal_sources gives us the law -- identifying
// which legal question the facts raise is Bevismotoren's own job, never
// something the customer's documents need to already contain. A case with
// zero legal argumentation in its documents is not a documentation gap;
// it's simply a question this engine hasn't been asked to answer yet.
const SYSTEM_PROMPT = `Du identifiserer hvilke RETTSSPØRSMÅL fakta i en skattesak reiser -- ikke om kunden har rett, bare hvilket spørsmål som faktisk må vurderes.

Du skal:
- Kun basere deg på de oppgitte fakta/påstandene under. Du dikter ALDRI opp fakta som ikke finnes der.
- Formulere hvert rettsspørsmål presist og nøytralt, f.eks. "Har kunden rett til fradrag for kostnaden til X?" -- aldri som en påstand om utfallet.
- Knytte hvert rettsspørsmål til numrene på de konkrete fakta (claim_numbers) som reiser det.
- Manglende juridisk argumentasjon i kundens egne dokumenter er ALDRI en grunn til å utelate et rettsspørsmål -- din jobb er nettopp å identifisere spørsmålet og senere finne regelverket selv, ikke å vente på at kunden gjør det.
- Returnere en tom liste hvis fakta ikke reiser noe reelt rettsspørsmål ennå.

Svar alltid som gyldig JSON med nøyaktig dette feltet:
{"questions": [{"question": string, "claim_numbers": number[]}]}`;

function formatCase(input: LegalQuestionIdentificationInput): string {
  return [
    `Sak: ${input.caseTitle}`,
    `Skattetype: ${input.taxType}`,
    "",
    wrapUntrustedContent("Brukerens forklaring", input.description ?? "(ingen)"),
    "",
    "Fakta/påstander i saken (nummerert):",
    formatIndexedClaims(input.claims),
  ].join("\n");
}

export const legalQuestionEngine = defineAiEngine<
  LegalQuestionIdentificationInput,
  LegalQuestionIdentificationOutput
>({
  name: "legal-question-identification",
  temperature: 0.2,
  schema: responseSchema,
  buildSystemPrompt: () => SYSTEM_PROMPT,
  buildUserPrompt: formatCase,
});

/** Drops claim_numbers the model returned that don't correspond to a real
 * claim it was given, and any empty question text -- same "index, never
 * raw id" hallucination guard used everywhere else in this codebase. */
export function sanitizeLegalQuestions(
  output: LegalQuestionIdentificationOutput,
  claims: IndexedClaim[]
): LegalQuestionIdentificationOutput {
  return {
    questions: output.questions
      .filter((q) => q.question.trim().length > 0)
      .map((q) => ({
        question: q.question,
        claimIndices: q.claimIndices.filter((i) => isValidClaimIndex(claims, i)),
      })),
  };
}
