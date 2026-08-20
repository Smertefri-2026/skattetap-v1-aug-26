import { z } from "zod";
import { defineAiEngine } from "@/lib/ai/engine";
import { wrapUntrustedContent } from "@/lib/ai/openai";
import type { DocumentExtraction } from "@/lib/ai/documentExtraction";

export interface CaseContextClaim {
  statement: string;
  status: "documented" | "undocumented" | "conflicting";
}

export interface CaseContextDocument {
  fileName: string;
  documentType: string;
  documentDate: string | null;
}

export interface DocumentCaseAnalysisInput {
  newDocument: {
    fileName: string;
    extraction: DocumentExtraction;
  };
  existingClaims: CaseContextClaim[];
  otherDocuments: CaseContextDocument[];
}

export interface DocumentGap {
  description: string;
  importance: string;
  recommendedDocument: string | null;
}

export interface DocumentCaseAnalysisOutput {
  keyPoints: string[];
  credibility: "high" | "medium" | "low";
  credibilityReasoning: string;
  contradictsClaimIndices: number[];
  supportsClaimIndices: number[];
  relatedDocumentIndices: number[];
  documentGaps: DocumentGap[];
  recommendedNextDocuments: string[];
}

const responseSchema = z
  .object({
    key_points: z.array(z.string().min(1).max(200)).max(6).catch([]),
    credibility: z.enum(["high", "medium", "low"]).catch("medium"),
    credibility_reasoning: z.string().min(1).max(300),
    // 1-based indices into existingClaims/otherDocuments, matching the
    // established "index, never raw id" pattern used everywhere the AI
    // references case data -- out-of-range indices are dropped, not
    // trusted, since the model cannot hallucinate a real claim/document id
    // this way but it can hallucinate a number.
    contradicts_claim_numbers: z.array(z.number().int()).max(10).catch([]),
    supports_claim_numbers: z.array(z.number().int()).max(10).catch([]),
    related_document_numbers: z.array(z.number().int()).max(10).catch([]),
    document_gaps: z
      .array(
        z.object({
          description: z.string().min(1).max(200),
          importance: z.string().min(1).max(200),
          recommended_document: z.string().min(1).max(150).nullable().catch(null),
        })
      )
      .max(5)
      .catch([]),
    recommended_next_documents: z.array(z.string().min(1).max(200)).max(5).catch([]),
  })
  .transform((raw) => ({
    keyPoints: raw.key_points,
    credibility: raw.credibility,
    credibilityReasoning: raw.credibility_reasoning,
    contradictsClaimIndices: raw.contradicts_claim_numbers,
    supportsClaimIndices: raw.supports_claim_numbers,
    relatedDocumentIndices: raw.related_document_numbers,
    documentGaps: raw.document_gaps.map((g) => ({
      description: g.description,
      importance: g.importance,
      recommendedDocument: g.recommended_document,
    })),
    recommendedNextDocuments: raw.recommended_next_documents,
  }));

function isValidIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 1 && index <= length;
}

/** Filters out any index the model returned that doesn't correspond to a
 * real numbered item in the prompt -- the same hallucination guard used
 * for rule codes and claim references elsewhere in the codebase. */
export function sanitizeAnalysisIndices(
  output: DocumentCaseAnalysisOutput,
  claimCount: number,
  documentCount: number
): DocumentCaseAnalysisOutput {
  return {
    ...output,
    contradictsClaimIndices: output.contradictsClaimIndices.filter((i) => isValidIndex(i, claimCount)),
    supportsClaimIndices: output.supportsClaimIndices.filter((i) => isValidIndex(i, claimCount)),
    relatedDocumentIndices: output.relatedDocumentIndices.filter((i) => isValidIndex(i, documentCount)),
  };
}

function formatClaims(claims: CaseContextClaim[]): string {
  if (claims.length === 0) return "(ingen fakta registrert i saken ennå)";
  return claims.map((c, i) => `${i + 1}. [${c.status}] ${c.statement}`).join("\n");
}

function formatOtherDocuments(docs: CaseContextDocument[]): string {
  if (docs.length === 0) return "(ingen andre dokumenter i saken ennå)";
  return docs
    .map((d, i) => `${i + 1}. ${d.fileName} (${d.documentType}, dato: ${d.documentDate ?? "ukjent"})`)
    .join("\n");
}

function formatNewDocumentExtraction(extraction: DocumentExtraction): string {
  const lines = [
    `Type: ${extraction.document_type}`,
    `Dato: ${extraction.document_date ?? "ukjent"}`,
    `Parter: ${extraction.parties.join(", ") || "ingen"}`,
    `Beløp: ${extraction.amounts.map((a) => `${a.label}: ${a.amount_kr} kr`).join(", ") || "ingen"}`,
    "Mulige fakta:",
    ...extraction.possible_facts.map((f) => `- ${f.statement}`),
  ];
  return lines.join("\n");
}

const SYSTEM_PROMPT = `Du er dokumentmotoren i Skattetap sin Evidence Engine. Du vurderer ETT nytt dokument opp mot resten av saken -- ikke saken som helhet.

Du skal:
- Trekke ut korte nøkkelpunkter fra dette dokumentet.
- Vurdere dokumentets troverdighet (high/medium/low) med en kort begrunnelse -- offisielle vedtak og kontoutskrifter er normalt mer troverdige enn uformelle notater.
- Identifisere hvilke EKSISTERENDE fakta (nummerert liste under) dette dokumentet støtter, og hvilke det motsier. Bruk KUN numrene fra listen -- finn du ingen, la listen være tom.
- Identifisere hvilke ANDRE dokumenter (nummerert liste under) dette dokumentet henger sammen med.
- Peke på konkrete mangler ved DETTE dokumentet (ikke saken generelt). For hver mangel: hva som mangler, HVORFOR det er viktig for saken, og om mulig hvilket konkret dokument som ville tettet den.
- I tillegg: konkret hvilke(t) dokument(er) som generelt ville styrket saken hvis brukeren skaffet dem.

Du dikter ALDRI opp fakta, beløp eller sammenhenger som ikke faktisk støttes av teksten under. Er du usikker, si det -- ikke gjett.

Svar alltid som gyldig JSON med nøyaktig disse feltene:
{"key_points": string[], "credibility": "high"|"medium"|"low", "credibility_reasoning": string, "contradicts_claim_numbers": number[], "supports_claim_numbers": number[], "related_document_numbers": number[], "document_gaps": [{"description": string, "importance": string, "recommended_document": string | null}], "recommended_next_documents": string[]}`;

export const documentCaseAnalysisEngine = defineAiEngine<
  DocumentCaseAnalysisInput,
  DocumentCaseAnalysisOutput
>({
  name: "document-case-analysis",
  temperature: 0.2,
  schema: responseSchema,
  buildSystemPrompt: () => SYSTEM_PROMPT,
  buildUserPrompt: (input) =>
    [
      wrapUntrustedContent("Nytt dokument", formatNewDocumentExtraction(input.newDocument.extraction)),
      "",
      wrapUntrustedContent("Eksisterende fakta i saken (nummerert)", formatClaims(input.existingClaims)),
      "",
      wrapUntrustedContent("Andre dokumenter i saken (nummerert)", formatOtherDocuments(input.otherDocuments)),
    ].join("\n"),
});
