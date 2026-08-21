import { z } from "zod";
import { defineAiEngine } from "@/lib/ai/engine";
import { wrapUntrustedContent } from "@/lib/ai/openai";
import type { SaksbehandlerContext } from "./context";

export type ChatReferenceType = "document" | "conflict" | "gap" | "report" | "timeline";

export interface ChatReference {
  type: ChatReferenceType;
  /** 1-based index into the matching numbered list in SaksbehandlerContext
   * (documents/openConflicts/gaps/reports/timelineEvents) -- same
   * "index, never raw id" hallucination guard used everywhere else the AI
   * references case data. */
  number: number;
}

export interface SaksbehandlerChatInput {
  context: SaksbehandlerContext;
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}

export interface SaksbehandlerChatOutput {
  answer: string;
  needsEscalation: boolean;
  escalationReason: string | null;
  references: ChatReference[];
}

const chatResponseSchema = z
  .object({
    answer: z.string(),
    needs_escalation: z.boolean().catch(false),
    escalation_reason: z.string().nullable().catch(null),
    references: z
      .array(
        z.object({
          type: z.enum(["document", "conflict", "gap", "report", "timeline"]),
          number: z.number().int(),
        })
      )
      .max(8)
      .catch([]),
  })
  .transform((raw) => ({
    answer: raw.answer,
    needsEscalation: raw.needs_escalation,
    escalationReason: raw.escalation_reason,
    references: raw.references,
  }));

function isValidIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 1 && index <= length;
}

/** Filters out any reference the model returned that doesn't correspond to
 * a real numbered item in the prompt -- the same hallucination guard used
 * for claim/document indices in the document-analysis engine. */
export function sanitizeChatReferences(
  references: ChatReference[],
  context: SaksbehandlerContext
): ChatReference[] {
  const lengthByType: Record<ChatReferenceType, number> = {
    document: context.documents.length,
    conflict: context.openConflicts.length,
    gap: context.gaps.length,
    report: context.reports.length,
    timeline: context.timelineEvents.length,
  };
  return references.filter((r) => isValidIndex(r.number, lengthByType[r.type]));
}

function formatDocuments(documents: SaksbehandlerContext["documents"]): string {
  if (documents.length === 0) return "(ingen dokumenter lastet opp ennå)";
  return documents
    .map(
      (d, i) =>
        `${i + 1}. ${d.fileName} (${d.documentType}, dato: ${d.documentDate ?? "ukjent"}, troverdighet: ${d.credibility ?? "ikke vurdert"})`
    )
    .join("\n");
}

function formatTimeline(events: SaksbehandlerContext["timelineEvents"]): string {
  if (events.length === 0) return "(ingen daterte hendelser ennå)";
  return events
    .map((e, i) => `${i + 1}. ${e.date} -- ${e.fileName}${e.keyPoints.length ? ": " + e.keyPoints.join("; ") : ""}`)
    .join("\n");
}

function formatGaps(gaps: SaksbehandlerContext["gaps"]): string {
  if (gaps.length === 0) return "(ingen åpne dokumentasjonshull)";
  return gaps
    .map(
      (g, i) =>
        `${i + 1}. ${g.description}${g.importance ? ` -- ${g.importance}` : ""}${
          g.recommendedDocument ? ` (anbefalt dokument: ${g.recommendedDocument})` : ""
        }`
    )
    .join("\n");
}

function formatConflicts(conflicts: SaksbehandlerContext["openConflicts"]): string {
  if (conflicts.length === 0) return "(ingen åpne konflikter)";
  return conflicts
    .map(
      (c, i) =>
        `${i + 1}. "${c.statementA}" motsier "${c.statementB}". Hvorfor: ${c.reasoning} Avklares ved: ${c.clarifyingQuestion}${
          c.recommendedDocument ? ` (anbefalt dokument: ${c.recommendedDocument})` : ""
        }`
    )
    .join("\n");
}

function formatReports(reports: SaksbehandlerContext["reports"]): string {
  if (reports.length === 0) return "(ingen rapporter generert ennå)";
  return reports
    .map((r, i) => `${i + 1}. ${r.type} (generert ${new Date(r.createdAt).toLocaleDateString("no-NO")})`)
    .join("\n");
}

function formatNextAction(nextAction: SaksbehandlerContext["nextAction"]): string {
  if (!nextAction) return "(ikke beregnet ennå)";
  return `${nextAction.action} -- ${nextAction.reasoning}`;
}

function formatContext(context: SaksbehandlerContext): string {
  const lines = [
    `Sakstittel: ${context.caseTitle}`,
    `Steg: ${context.stage}`,
    `Status: ${context.status}`,
    `Antatt beløp: ${context.totalAmountKr} kr`,
    `Dokumenter: ${context.documentCount} (${context.documentsBeingProcessed} under analyse, ${context.documentsFailed} feilet)`,
    "",
    "Sakens egen beregnede neste anbefalte handling (autoritativ -- ikke finn opp en annen):",
    formatNextAction(context.nextAction),
    "",
    "Dokumenterte fakta:",
    ...(context.documentedFacts.length > 0
      ? context.documentedFacts.map((f) => `- ${f}`)
      : ["(ingen ennå)"]),
    "",
    "Dokumenter (nummerert):",
    formatDocuments(context.documents),
    "",
    "Tidslinje (nummerert):",
    formatTimeline(context.timelineEvents),
    "",
    "Åpne dokumentasjonshull (nummerert):",
    formatGaps(context.gaps),
    "",
    "Åpne konflikter mellom dokumenter, uavklart hvem som har rett (nummerert):",
    formatConflicts(context.openConflicts),
    "",
    "Genererte rapporter (nummerert):",
    formatReports(context.reports),
    "",
    "Relevant regelverk:",
    ...(context.applicableRules.length > 0
      ? context.applicableRules.map((r) => `- ${r.rule_code} (${r.law_reference}): ${r.short_explanation}`)
      : ["(ingen identifisert ennå)"]),
  ];

  return lines.join("\n");
}

const SYSTEM_PROMPT_INSTRUCTIONS = `Du er Skattetap sin digitale saksbehandler for én konkret sak. Du kjenner hele saken -- dokumentene, tidslinjen, konfliktene, dokumentasjonshullene og rapportene under -- ikke bare siste melding.

Du skal:
- Svare kun basert på det som faktisk er oppgitt om saken under.
- Alltid forklare KORT hvorfor du mener det du mener, med henvisning til de konkrete fakta/dokumentene/konfliktene.
- Når svaret ditt konkret handler om ett eller flere nummererte elementer (et dokument, en konflikt, et dokumentasjonshull, en rapport, en tidslinjehendelse): legg dem i "references" med riktig type og nummer, slik at brukeren kan hoppe direkte dit -- ikke bare nevne dem i teksten.
- Hvis saken har en åpen konflikt som er relevant for spørsmålet: forklar HVORFOR den er en konflikt (de to motstridende opplysningene) og hva som konkret avklarer den, i stedet for å late som fakta er sikkert.
- Sakens egen beregnede "neste anbefalte handling" over er autoritativ og vises allerede til brukeren et annet sted i grensesnittet -- ikke finn opp en konkurrerende anbefaling. Forklar heller HVORFOR den handlingen er riktig akkurat nå, hvis spørsmålet gjelder det.
- ALDRI gjette eller finne opp fakta, beløp eller regelverk som ikke står i konteksten.

Hvis spørsmålet krever informasjon du ikke har, krever juridisk skjønn utover det som er dokumentert, eller du av andre grunner ikke kan svare forsvarlig: sett needs_escalation til true. Ikke gjett i stedet -- forklar heller ærlig i "answer" at spørsmålet ikke kan vurderes sikkert ut fra opplysningene du har nå. Fyll escalation_reason med konkret hva som mangler for å kunne svare: hvilke opplysninger som mangler, hvilke rettskilder som eventuelt må undersøkes nærmere, og hva brukeren selv kan gjøre videre. Skattetap har ingen interne rådgivere som overtar saker fra deg -- aldri antyd at noen internt vil se på saken eller ta kontakt. Kun når spørsmålet faktisk er av en type som bør vurderes av advokat eller annen kvalifisert skatterådgiver (aldri som fast frase, kun når det genuint stemmer): si det rett ut, som en anbefaling om å søke ekstern hjelp -- ikke et internt tilbud fra Skattetap.

Svar alltid som gyldig JSON med nøyaktig disse feltene:
{"answer": string, "needs_escalation": boolean, "escalation_reason": string | null, "references": [{"type": "document"|"conflict"|"gap"|"report"|"timeline", "number": number}]}`;

export const saksbehandlerChatEngine = defineAiEngine<SaksbehandlerChatInput, SaksbehandlerChatOutput>({
  name: "saksbehandler-chat",
  temperature: 0.3,
  schema: chatResponseSchema,
  buildSystemPrompt: (input) =>
    [SYSTEM_PROMPT_INSTRUCTIONS, "", wrapUntrustedContent("Saksinformasjon", formatContext(input.context))].join(
      "\n"
    ),
  buildHistory: (input) => input.history,
  buildUserPrompt: (input) => wrapUntrustedContent("Brukerens spørsmål", input.question),
});
