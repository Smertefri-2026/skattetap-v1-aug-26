import { MinSideHeader } from "@/components/min-side/MinSideHeader";
import { isAdminUser } from "@/lib/auth/requireAdmin";
import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";

export default async function MinSideLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const supabase = await createClient();
  const isAdmin = await isAdminUser(supabase, user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <MinSideHeader email={user.email ?? ""} isAdmin={isAdmin} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
