import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * The browser client (@supabase/ssr's createBrowserClient) hardcodes
 * flowType: "pkce", which means every signUp/resetPasswordForEmail call
 * from this app carries a PKCE code_challenge. Supabase's own hosted
 * /auth/v1/verify endpoint completes that exchange and redirects here with
 * a `code` param -- token_hash-based verifyOtp() is for the separate,
 * non-PKCE implicit/OTP flow, and Supabase does not honor a custom
 * token_hash link for a PKCE-initiated request regardless of what the
 * email template's href says. `code` is therefore the real, primary path;
 * token_hash is kept as a fallback in case a link is ever issued without
 * going through the PKCE hop (e.g. an admin-generated link).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/min-side";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("AUTH CONFIRM ERROR (code)", { message: error.message, status: error.status });
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("AUTH CONFIRM ERROR (token_hash)", { message: error.message, status: error.status, type });
  }

  return NextResponse.redirect(`${origin}/logg-inn?error=ugyldig-eller-utlopt-lenke`);
}
