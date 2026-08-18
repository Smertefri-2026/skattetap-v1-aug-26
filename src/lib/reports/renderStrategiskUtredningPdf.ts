import { PdfWriter } from "./pdfWriter";
import type { StrategiskUtredningReportContent } from "./types";

export async function renderStrategiskUtredningPdf(
  caseTitle: string,
  content: StrategiskUtredningReportContent
): Promise<Uint8Array> {
  const w = await PdfWriter.create();

  w.title(`Strategisk utredning -- ${caseTitle}`);
  w.paragraph(
    "Analyse på tvers av flere av dine saker og skatteår. Skiller mellom dokumenterte fakta, dine egne opplysninger, KI-vurderinger, regelverk og antakelser. Ikke en juridisk konklusjon eller en garanti for utfall."
  );

  w.heading("Saker inkludert i denne utredningen");
  w.bulletList(
    content.included_cases.map((c) => `${c.title}${c.is_primary ? " (denne saken)" : ""} -- ${c.tax_period ?? "periode ikke oppgitt"}`),
    "Ingen saker inkludert."
  );

  w.heading("Dine egne opplysninger");
  w.bulletList(
    content.user_explanations.map((u) => `${u.case_title}: ${u.explanation}`),
    "Ingen egne opplysninger registrert."
  );

  w.heading("Dokumenterte fakta per sak");
  w.bulletList(
    content.documented_facts_overview.flatMap((d) => d.facts.map((f) => `${d.case_title}: ${f}`)),
    "Ingen dokumenterte fakta registrert ennå."
  );

  w.heading("Dokumentasjonshull per sak");
  w.bulletList(
    content.documentation_gaps_overview.flatMap((d) => d.gaps.map((g) => `${d.case_title}: ${g}`)),
    "Ingen hull registrert."
  );

  w.heading("Mønstre på tvers av saker og år");
  w.bulletList(
    content.patterns.map((p) => `${p.description} (${p.case_titles.join(", ")})`),
    "Ingen gjentakende mønstre identifisert."
  );

  w.heading("Sammenligninger");
  w.bulletList(
    content.comparisons.map((c) => `[${c.dimension}] ${c.description} (${c.case_titles.join(", ")})`),
    "Ingen sammenligninger gjort."
  );

  w.heading("Fristvurdering per sak");
  w.bulletList(
    content.deadlines.map((d) =>
      d.status === "vurdert"
        ? `${d.case_title}: frist ${d.deadline_date} (${d.deadline_type}, kilde: ${d.source})`
        : `${d.case_title}: frist ikke vurdert -- ${d.note}`
    ),
    "Ingen saker å vurdere frist for."
  );

  w.heading("Samlet økonomisk eksponering");
  w.paragraph(`${content.financial_exposure.total_amount_kr} kr samlet på tvers av inkluderte saker.`);
  w.bulletList(
    content.financial_exposure.breakdown_by_case.map((b) => `${b.case_title}: ${b.amount_kr} kr`),
    "Ingen beløp identifisert."
  );

  w.heading("Berørt regelverk");
  w.bulletList(
    content.applicable_rules.map((r) => `${r.law_reference} ${r.provision} -- ${r.short_explanation}`),
    "Ingen regler identifisert som relevante ennå."
  );

  w.heading("Alternative strategier");
  for (const s of content.strategies) {
    w.paragraph(`${s.name}: ${s.description}`);
    w.bulletList(s.strengths.map((x) => `Styrke: ${x}`), "");
    w.bulletList(s.weaknesses.map((x) => `Svakhet: ${x}`), "");
    w.bulletList(s.risks.map((x) => `Risiko: ${x}`), "");
    w.bulletList(s.consequences.map((x) => `Konsekvens: ${x}`), "");
  }
  if (content.strategies.length === 0) {
    w.paragraph("Ingen strategier identifisert ennå.");
  }

  w.heading("Samlet strategisk vurdering");
  w.paragraph(content.overall_assessment);

  w.heading("Prioriterte saker");
  w.bulletList(
    content.prioritized_cases.map((p) => `${p.case_title}: ${p.reasoning}`),
    "Ingen prioritering gjort ennå."
  );

  w.heading("Antakelser denne utredningen bygger på");
  w.bulletList(content.assumptions, "Ingen eksplisitte antakelser registrert.");

  w.heading("Anbefalte neste steg");
  w.bulletList(content.recommended_next_steps, "Ingen anbefalinger ennå.");

  return w.bytes();
}
