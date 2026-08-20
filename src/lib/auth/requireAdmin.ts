import { redirect } from "next/navigation";
import { requireUser } from "./requireUser";
import { createClient } from "@/lib/supabase/server";

/**
 * Same shape as requireUser -- redirects instead of throwing, so every
 * /admin page can just call this and render, the same way every /min-side
 * page calls requireUser. Checked with the caller's own session against
 * admin_users (RLS: a user can only ever read their own row there), not
 * with the service-role client -- an unauthenticated or non-admin caller
 * must never be able to answer "am I an admin" for anyone but themselves.
 */
export async function requireAdmin() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();

  if (!data) {
    redirect("/min-side");
  }

  return user;
}
