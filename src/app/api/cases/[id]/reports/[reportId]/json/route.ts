import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";

/**
 * Machine-readable export of a generated report -- the "saksmappe" is
 * meant to be usable outside Skattetap too (handed to an external advisor,
 * archived, fed into Skatteendring/Strategisk utredning later), not
 * locked into the PDF's fixed layout.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const user = await requireUser();
  const { id: caseId, reportId } = await params;

  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, user_id")
    .eq("id", caseId)
    .single();
  if (!caseRow || caseRow.user_id !== user.id) {
    return NextResponse.json({ error: "Fant ikke saken." }, { status: 404 });
  }

  const { data: report } = await supabase
    .from("reports")
    .select("type, content, created_at")
    .eq("id", reportId)
    .eq("case_id", caseId)
    .single();
  if (!report) {
    return NextResponse.json({ error: "Fant ikke rapporten." }, { status: 404 });
  }

  return new NextResponse(JSON.stringify(report, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${report.type}-${caseId}.json"`,
    },
  });
}
