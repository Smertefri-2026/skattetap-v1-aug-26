import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Explicit 303: the default 307 preserves the request method, which
  // turns this into a POST to "/" -- a page that only accepts GET, and
  // the user is left on a broken page even though sign-out itself worked.
  return NextResponse.redirect(new URL("/", request.url), 303);
}
