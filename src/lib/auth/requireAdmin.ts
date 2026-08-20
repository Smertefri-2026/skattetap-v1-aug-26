import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "./requireUser";
import { createClient } from "@/lib/supabase/server";

/**
 * Checked with the caller's own session against admin_users (RLS: a user
 * can only ever read their own row there), not with the service-role
 * client -- an unauthenticated or non-admin caller must never be able to
 * answer "am I an admin" for anyone but themselves. Split out from
 * requireAdmin so a page that merely wants to show/hide an "Admin" link
 * (MinSideHeader) doesn't have to redirect to find out.
 */
export async function isAdminUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
  return data !== null;
}

/** Same shape as requireUser -- redirects instead of throwing, so every
 * /admin page can just call this and render, the same way every /min-side
 * page calls requireUser. */
export async function requireAdmin() {
  const user = await requireUser();
  const supabase = await createClient();

  if (!(await isAdminUser(supabase, user.id))) {
    redirect("/min-side");
  }

  return user;
}
