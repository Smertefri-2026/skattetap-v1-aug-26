import { PdfWriter } from "./pdfWriter";
import type { SkatteendringReportContent } from "./types";

export async function renderSkatteendringPdf(
  caseTitle: string,
  content: SkatteendringReportContent
): Promise<Uint8Array> {
  const w = await PdfWriter.create();

  w.title(`Forslag til skatteendring -- ${caseTitle}`);
  w.paragraph("Utkast fra Skattetap -- gjennomgå før innsending. Ikke en juridisk konklusjon.");

  w.heading("Henvendelse");
  w.paragraph(content.proposal_text);

  w.heading("Begrunnelse");
  w.paragraph(content.reasoning);

  w.heading("Grunnlagsdokumenter");
  w.bulletList(
    content.referenced_documents.map((d) => `${d.filename} -- ${d.relevance}`),
    "Ingen dokumenter referert ennå."
  );

  w.heading("Vedleggsliste");
  w.bulletList(content.attachments, "Ingen vedlegg foreslått ennå.");

  w.heading("Manglende opplysninger");
  w.bulletList(content.missing_information, "Ingen mangler identifisert.");

  w.heading("Relevant regelverk");
  w.bulletList(
    content.applicable_rules.map(
      (r) => `${r.law_reference} ${r.provision} -- ${r.short_explanation}`
    ),
    "Ingen regler vurdert som relevante ennå."
  );

  return w.bytes();
}
