import { z } from "zod";
import { callAiChatJson, wrapUntrustedContent } from "./openai";

export const DOCUMENT_EXTRACTION_INSTRUCTIONS = [
  "Du leser ut kun det som faktisk observerbart står i et opplastet dokument -- du vurderer ikke, tolker ikke og konkluderer ikke.",
  "Du finner ALDRI på informasjon som ikke finnes i teksten. Finner du ingenting for et listefelt (parties, amounts, possible_facts), inkluderer du feltet likevel som en TOM liste [] -- du utelater ALDRI et felt fra svaret.",
  "possible_facts skal være korte, konkrete setninger direkte støttet av teksten -- ikke antagelser om hva de betyr for skattesaken.",
  "Hvert element i possible_facts merkes med confidence (high/medium/low). Er du usikker, bruk ALDRI 'high'.",
  "Du dikter ikke opp beløp -- oppgi kun beløp som faktisk står i teksten.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

// .catch() is defense in depth beyond the prompt instruction above: if the
// model omits a field (or sends the wrong shape) despite being told not
// to, parsing that one field falls back to a safe empty/neutral value
// instead of throwing away the entire extraction.
const documentExtractionSchema = z.object({
  document_type: z
    .enum(["kvittering", "kontrakt", "vedtak", "lonnsslipp", "kontoutskrift", "brev", "annet"])
    .catch("annet"),
  document_date: z.string().nullable().catch(null),
  parties: z.array(z.string().min(1).max(200)).max(6).catch([]),
  amounts: z
    .array(z.object({ label: z.string().min(1).max(120), amount_kr: z.number() }))
    .max(6)
    .catch([]),
  possible_facts: z
    .array(
      z.object({
        statement: z.string().min(1).max(300),
        confidence: z.enum(["high", "medium", "low"]),
      })
    )
    .max(8)
    .catch([]),
});

export type DocumentExtraction = z.infer<typeof documentExtractionSchema>;

const RESPONSE_SCHEMA_HINT = `Svar med et JSON-objekt på nøyaktig denne formen. Inkluder ALLTID alle feltene -- bruk tom liste [] for et listefelt du ikke finner grunnlag for, ALDRI utelat feltet:
{
  "document_type": "kvittering | kontrakt | vedtak | lonnsslipp | kontoutskrift | brev | annet",
  "document_date": "YYYY-MM-DD eller null",
  "parties": ["navn på avsender/mottaker/parter nevnt i dokumentet"],
  "amounts": [{ "label": "hva beløpet gjelder", "amount_kr": 0 }],
  "possible_facts": [{ "statement": "kort, konkret setning fra dokumentet", "confidence": "high | medium | low" }]
}`;

function buildDocumentExtractionPrompt(params: {
  fileName: string;
  extractedText: string;
}): string {
  return [
    `Filnavn: ${params.fileName}`,
    wrapUntrustedContent("Uthentet tekst fra dokumentet:", params.extractedText),
    "",
    RESPONSE_SCHEMA_HINT,
  ].join("\n");
}

export async function analyzeDocument(params: {
  fileName: string;
  extractedText: string;
}): Promise<DocumentExtraction> {
  return callAiChatJson({
    systemPrompt: DOCUMENT_EXTRACTION_INSTRUCTIONS,
    userPrompt: buildDocumentExtractionPrompt(params),
    validate: (value) => documentExtractionSchema.parse(value),
  });
}
