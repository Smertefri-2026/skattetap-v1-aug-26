import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { renderKomplettSakPdf } from "@/lib/reports/renderKomplettSakPdf";
import { renderFullCheckReportPdf } from "@/lib/reports/renderReportPdf";
import { renderSkatteendringPdf } from "@/lib/reports/renderSkatteendringPdf";
import { renderStrategiskUtredningPdf } from "@/lib/reports/renderStrategiskUtredningPdf";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const user = await requireUser();
  const { id: caseId, reportId } = await params;

  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, title, user_id")
    .eq("id", caseId)
    .single();
  if (!caseRow || caseRow.user_id !== user.id) {
    return NextResponse.json({ error: "Fant ikke saken." }, { status: 404 });
  }

  const { data: report } = await supabase
    .from("reports")
    .select("type, content")
    .eq("id", reportId)
    .eq("case_id", caseId)
    .single();
  if (!report) {
    return NextResponse.json({ error: "Fant ikke rapporten." }, { status: 404 });
  }

  let pdfBytes: Uint8Array;
  switch (report.type) {
    case "skatteendring":
      pdfBytes = await renderSkatteendringPdf(caseRow.title, report.content);
      break;
    case "komplett-sak":
      pdfBytes = await renderKomplettSakPdf(caseRow.title, report.content);
      break;
    case "strategisk-utredning":
      pdfBytes = await renderStrategiskUtredningPdf(caseRow.title, report.content);
      break;
    default:
      pdfBytes = await renderFullCheckReportPdf(caseRow.title, report.content);
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.type}-${caseId}.pdf"`,
    },
  });
}
