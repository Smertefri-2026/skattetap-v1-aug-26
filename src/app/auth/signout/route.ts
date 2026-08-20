import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Optional hidden "next" field -- e.g. /utsjekk's sign-out button sends
  // it back to the checkout with the chosen product preserved instead of
  // the default "/". Existing callers (AccountMenu) don't send it, so
  // they keep landing on "/" exactly as before.
  const formData = await request.formData().catch(() => null);
  const next = formData?.get("next");
  const redirectTo = typeof next === "string" && next.startsWith("/") ? next : "/";

  // Explicit 303: the default 307 preserves the request method, which
  // turns this into a POST to the target -- a page that only accepts GET,
  // and the user is left on a broken page even though sign-out worked.
  return NextResponse.redirect(new URL(redirectTo, request.url), 303);
}
