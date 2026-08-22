import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { processDocumentUpload } from "@/lib/documents/processUpload";
import { checkUploadAllowed } from "@/lib/products/capacity";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id: caseId } = await params;

  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, user_id")
    .eq("id", caseId)
    .single();

  if (!caseRow || caseRow.user_id !== user.id) {
    return NextResponse.json({ error: "Fant ikke saken." }, { status: 404 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Ingen fil ble sendt." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Filen er for stor (maks 20 MB)." }, { status: 400 });
  }

  // Checked before any extraction/AI call starts -- the expensive part of
  // this request must never run once the case's included capacity is
  // used up. The frontend also disables the upload button at the limit,
  // but that's UX only; this is the actual gate.
  const capacityCheck = await checkUploadAllowed(supabase, caseId, file.size);
  if (!capacityCheck.allowed) {
    return NextResponse.json({ error: capacityCheck.reason }, { status: 402 });
  }

  try {
    const result = await processDocumentUpload(supabase, {
      caseId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes: await file.arrayBuffer(),
      userId: user.id,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke behandle dokumentet. Prøv igjen." },
      { status: 502 }
    );
  }
}
