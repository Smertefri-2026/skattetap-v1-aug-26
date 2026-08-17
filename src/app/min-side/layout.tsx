import { MinSideHeader } from "@/components/min-side/MinSideHeader";
import { requireUser } from "@/lib/auth/requireUser";

export default async function MinSideLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <MinSideHeader email={user.email ?? ""} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
