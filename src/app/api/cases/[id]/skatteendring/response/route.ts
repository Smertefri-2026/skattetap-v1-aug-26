import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { hasAccess } from "@/lib/products/entitlement";
import { processSkatteetatenResponse } from "@/lib/skatteendring/processResponse";
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
    .select("id, title, user_id")
    .eq("id", caseId)
    .single();
  if (!caseRow || caseRow.user_id !== user.id) {
    return NextResponse.json({ error: "Fant ikke saken." }, { status: 404 });
  }

  if (!(await hasAccess(supabase, caseId, "skatteendring"))) {
    return NextResponse.json(
      { error: "Du har ikke tilgang til Skatteendring for denne saken." },
      { status: 403 }
    );
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Ingen fil ble sendt." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Filen er for stor (maks 20 MB)." }, { status: 400 });
  }

  try {
    const result = await processSkatteetatenResponse(supabase, {
      caseId,
      caseTitle: caseRow.title,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes: await file.arrayBuffer(),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke behandle svaret. Prøv igjen." },
      { status: 502 }
    );
  }
}
