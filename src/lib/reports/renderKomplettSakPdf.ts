import { PdfWriter } from "./pdfWriter";
import type { KomplettSakReportContent } from "./types";

export async function renderKomplettSakPdf(
  caseTitle: string,
  content: KomplettSakReportContent
): Promise<Uint8Array> {
  const w = await PdfWriter.create();

  w.title(`Komplett saksmappe -- ${caseTitle}`);
  w.paragraph(
    "Utvidet analyse fra Skattetap. Skiller mellom dokumenterte fakta, brukerens forklaring, KI-vurderinger og skatterettslige vurderinger. Ikke en juridisk konklusjon."
  );

  w.heading("Sammendrag");
  w.paragraph(content.case_summary);

  if (content.user_explanation) {
    w.heading("Brukerens forklaring");
    w.paragraph(content.user_explanation);
  }

  w.heading("Kronologi");
  w.bulletList(
    content.chronology.map(
      (c) => `${c.date ?? "udatert"} -- ${c.description} [${sourceLabel(c.source_type)}]`
    ),
    "Ingen hendelser identifisert ennå."
  );

  w.heading("Faktastyrke");
  w.bulletList(
    content.fact_strength.map((f) => `[${strengthLabel(f.strength)}] ${f.statement} -- ${f.reasoning}`),
    "Ingen fakta vurdert ennå."
  );

  w.heading("Motstridende opplysninger");
  w.bulletList(
    content.conflicts.map(
      (c) => `[${c.severity}] ${c.description} (gjelder: ${c.statements.join("; ")})`
    ),
    "Ingen motsigelser identifisert."
  );

  w.heading("Dokumentasjonshull og forslag til innhenting");
  w.bulletList(
    content.documentation_gaps.map(
      (g) => `${g.description} -- Forslag: ${g.suggested_action}`
    ),
    "Ingen hull identifisert."
  );

  w.heading("Beløp og økonomisk konsekvens");
  w.paragraph(`Samlet identifisert beløp: ${content.financial_summary.total_amount_kr} kr`);
  w.bulletList(
    content.financial_summary.breakdown.map((a) => `${a.label}: ${a.amount_kr} kr`),
    "Ingen fordeling tilgjengelig."
  );
  w.paragraph(content.financial_summary.impact_note);

  w.heading("Kobling mellom fakta og regelverk");
  w.bulletList(
    content.claim_rule_links.map(
      (l) => `${l.statement} -> ${l.rules.map((r) => `${r.law_reference} ${r.provision}`).join(", ") || "ingen regel koblet"}`
    ),
    "Ingen kobling gjort ennå."
  );

  if (content.skatteetaten_context) {
    w.heading("Tidligere svar fra Skatteetaten");
    w.paragraph(content.skatteetaten_context);
  }

  w.heading("Alternative forklaringer/utfall");
  w.bulletList(
    content.alternative_scenarios.map((s) => `${s.scenario} -- ${s.note}`),
    "Saken vurderes som entydig -- ingen alternative tolkninger identifisert."
  );

  w.heading("Sakens sterkeste punkter");
  w.bulletList(content.strongest_points, "Ingen registrert.");

  w.heading("Sakens svakeste punkter");
  w.bulletList(content.weakest_points, "Ingen registrert.");

  w.heading("Skatterettslig vurdering");
  w.paragraph(content.legal_assessment);

  w.heading("KI-vurdering (generell syntese)");
  w.paragraph(content.ai_assessment);

  w.heading("Anbefalte neste steg");
  w.bulletList(content.recommended_next_steps, "Ingen anbefalinger ennå.");

  return w.bytes();
}

function sourceLabel(source: "documented" | "user_explanation" | "ai_inference") {
  return { documented: "dokumentert", user_explanation: "brukerens forklaring", ai_inference: "KI-utledning" }[
    source
  ];
}

function strengthLabel(strength: "strong" | "weak" | "conflicting") {
  return { strong: "sterkt", weak: "svakt", conflicting: "motstridende" }[strength];
}
