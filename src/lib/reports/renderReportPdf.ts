import { PdfWriter } from "./pdfWriter";
import type { FullCheckReportContent } from "./types";

export async function renderFullCheckReportPdf(
  caseTitle: string,
  content: FullCheckReportContent
): Promise<Uint8Array> {
  const w = await PdfWriter.create();

  w.title(caseTitle);
  w.paragraph("Full sjekk-rapport fra Skattetap -- ikke en juridisk konklusjon.");

  w.heading("Sammendrag");
  w.paragraph(content.summary);

  w.heading("Bakgrunn");
  w.paragraph(content.background);

  w.heading("Dokumenterte fakta");
  w.bulletList(
    content.documented_facts.map((f) => f.statement),
    "Ingen dokumenterte fakta ennå."
  );

  w.heading("Usikre eller udokumenterte forhold");
  w.bulletList(
    content.uncertain_or_missing.map((f) => f.statement),
    "Ingen udokumenterte forhold registrert."
  );

  w.heading("Motstridende opplysninger");
  w.bulletList(content.conflicting_information, "Ingen motstridende opplysninger identifisert.");

  w.heading("Tidslinje");
  w.bulletList(
    content.timeline.map((t) => `${t.date} -- ${t.label}`),
    "Ingen daterte dokumenter ennå."
  );

  w.heading("Parter");
  w.bulletList(content.parties, "Ingen parter identifisert ennå.");

  w.heading("Beløp");
  w.bulletList(
    content.amounts.map((a) => `${a.label}: ${a.amount_kr} kr`),
    "Ingen beløp identifisert ennå."
  );

  w.heading("Relevant regelverk");
  w.bulletList(
    content.applicable_rules.map(
      (r) => `${r.law_reference} ${r.provision} -- ${r.short_explanation}`
    ),
    "Ingen regler vurdert som relevante ennå."
  );

  w.heading("Vurdering");
  w.paragraph(content.assessment);

  w.heading("Dokumentasjonshull");
  w.bulletList(content.documentation_gaps, "Ingen hull identifisert.");

  w.heading("Anbefalte neste steg");
  w.bulletList(content.recommended_next_steps, "Ingen anbefalinger ennå.");

  return w.bytes();
}
