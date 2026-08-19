import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/min-side";

  console.log("AUTH CALLBACK", {
    hasCode: Boolean(code),
    next,
    origin,
  });

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("AUTH CALLBACK ERROR", {
        message: error.message,
        code: error.code,
        status: error.status,
      });
    } else {
      console.log("AUTH CALLBACK SUCCESS", { next });
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/logg-inn`);
}