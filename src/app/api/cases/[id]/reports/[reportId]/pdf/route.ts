import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { renderFullCheckReportPdf } from "@/lib/reports/renderReportPdf";
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
    .select("content")
    .eq("id", reportId)
    .eq("case_id", caseId)
    .single();
  if (!report) {
    return NextResponse.json({ error: "Fant ikke rapporten." }, { status: 404 });
  }

  const pdfBytes = await renderFullCheckReportPdf(caseRow.title, report.content);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="full-sjekk-${caseId}.pdf"`,
    },
  });
}
