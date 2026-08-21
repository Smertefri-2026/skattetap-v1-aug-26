import { z } from "zod";
import { defineAiEngine } from "@/lib/ai/engine";
import { wrapUntrustedContent } from "@/lib/ai/openai";

export interface LegalSourceCandidate {
  sourceCode: string;
  sourceType: string;
  citation: string | null;
  topic: string;
  shortExplanation: string;
}

export interface LegalSourceAnalysisInput {
  question: string;
  relatedClaimStatements: string[];
  candidateSources: LegalSourceCandidate[];
}

export type LegalSourceLocatorType = "paragraf" | "ledd" | "avsnitt" | "punkt" | "kapittel" | "annet";
export type LegalSourceSupports = "kunden" | "skatteetaten" | "noytral" | "uklar";

export interface LegalSourceCitation {
  /** 1-based index into LegalSourceAnalysisInput.candidateSources -- never
   * a raw legal_source_id, so the model can't hallucinate a source that
   * doesn't exist in the candidate list it was actually given. */
  sourceIndex: number;
  locatorType: LegalSourceLocatorType | null;
  locatorValue: string | null;
  bmSummary: string;
  relevanceReasoning: string;
  supports: LegalSourceSupports;
}

export interface LegalSourceAnalysisOutput {
  sources: LegalSourceCitation[];
  ourAssessment: string;
}

const responseSchema = z
  .object({
    sources: z
      .array(
        z.object({
          source_number: z.number().int(),
          locator_type: z
            .enum(["paragraf", "ledd", "avsnitt", "punkt", "kapittel", "annet"])
            .nullable()
            .catch(null),
          locator_value: z.string().max(120).nullable().catch(null),
          bm_summary: z.string().min(1).max(600),
          relevance_reasoning: z.string().min(1).max(400),
          supports: z.enum(["kunden", "skatteetaten", "noytral", "uklar"]).catch("uklar"),
        })
      )
      .max(8)
      .catch([]),
    our_assessment: z.string().min(1).max(1500),
  })
  .transform((raw) => ({
    sources: raw.sources.map((s) => ({
      sourceIndex: s.source_number,
      locatorType: s.locator_type,
      locatorValue: s.locator_value,
      bmSummary: s.bm_summary,
      relevanceReasoning: s.relevance_reasoning,
      supports: s.supports,
    })),
    ourAssessment: raw.our_assessment,
  }));

function isValidIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 1 && index <= length;
}

/** Drops any citation of a source_number outside the candidate list this
 * engine was actually given -- the model can never cite a legal_sources
 * row that wasn't explicitly offered, same guard as everywhere else. */
export function sanitizeLegalSourceAnalysis(
  output: LegalSourceAnalysisOutput,
  candidateCount: number
): LegalSourceAnalysisOutput {
  return {
    ...output,
    sources: output.sources.filter((s) => isValidIndex(s.sourceIndex, candidateCount)),
  };
}

const SYSTEM_PROMPT = `Du er rettskildeanalysen i Skattetaps Bevismotor. Du vurderer ETT rettsspørsmål opp mot et gitt sett med VERIFISERTE rettskilder -- du velger og analyserer aldri kilder utenfor listen du får oppgitt.

Du skal:
- Bruke UTELUKKENDE source_number-verdier fra kildelisten du får oppgitt. Du dikter ALDRI opp en kilde, et lovsitat eller en avgjørelse som ikke står i listen.
- For hver kilde du siterer: oppgi bm_summary -- DIN EGEN karakteristikk av hva den relevante delen innebærer for spørsmålet, ALDRI fremstilt som et direkte sitat. Oppgi locator_type/locator_value (paragraf/ledd/avsnitt/punkt/kapittel) hvis kilden har en naturlig underinndeling som er relevant her, ellers null.
- Vurdere om kilden taler for kunden, for Skatteetaten, er nøytral, eller uklar -- vær genuint balansert. Lovverket og kildene bestemmer, ikke et ønske om å gi kunden medhold. Skatteetatens syn er heller ikke automatisk fasit bare fordi det kommer fra Skatteetaten.
- Hvis INGEN av de oppgitte kildene faktisk er relevante for spørsmålet: returner en tom sources-liste og forklar det ærlig i our_assessment -- ikke tving frem en sitering bare for å ha noe å vise til.
- our_assessment er en samlet, etterprøvbar syntese på tvers av kildene du siterte. Du konkluderer ALDRI med at kunden vil få medhold eller at et utfall er sikkert -- du kan si at en argumentasjon fremstår sterkere eller svakere ut fra de verifiserte kildene og de oppgitte fakta.

Svar alltid som gyldig JSON med nøyaktig disse feltene:
{"sources": [{"source_number": number, "locator_type": "paragraf"|"ledd"|"avsnitt"|"punkt"|"kapittel"|"annet"|null, "locator_value": string|null, "bm_summary": string, "relevance_reasoning": string, "supports": "kunden"|"skatteetaten"|"noytral"|"uklar"}], "our_assessment": string}`;

function formatCandidates(sources: LegalSourceCandidate[]): string {
  if (sources.length === 0) return "(ingen verifiserte rettskilder tilgjengelig ennå)";
  return sources
    .map(
      (s, i) =>
        `${i + 1}. [${s.sourceType}] ${s.sourceCode}${s.citation ? ` (${s.citation})` : ""}: ${s.topic} -- ${s.shortExplanation}`
    )
    .join("\n");
}

function buildPrompt(input: LegalSourceAnalysisInput): string {
  return [
    wrapUntrustedContent("Rettsspørsmål", input.question),
    "",
    "Relevante fakta i saken:",
    ...(input.relatedClaimStatements.length
      ? input.relatedClaimStatements.map((s) => `- ${s}`)
      : ["(ingen konkrete fakta koblet ennå)"]),
    "",
    "Tilgjengelige VERIFISERTE rettskilder (bruk KUN disse source_number-verdiene):",
    formatCandidates(input.candidateSources),
  ].join("\n");
}

export const legalSourceAnalysisEngine = defineAiEngine<LegalSourceAnalysisInput, LegalSourceAnalysisOutput>({
  name: "legal-source-analysis",
  temperature: 0.2,
  schema: responseSchema,
  buildSystemPrompt: () => SYSTEM_PROMPT,
  buildUserPrompt: buildPrompt,
});
