import { requireUser } from "@/lib/auth/requireUser";

export async function ProfileTab() {
  const user = await requireUser();
  const createdAt = new Date(user.created_at).toLocaleDateString("no-NO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[16px] font-semibold text-ink">Profil</h2>
      <div className="max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
              E-post
            </p>
            <p className="mt-1 text-[14.5px] text-ink">{user.email}</p>
          </div>
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
              Konto opprettet
            </p>
            <p className="mt-1 text-[14.5px] text-ink">{createdAt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
