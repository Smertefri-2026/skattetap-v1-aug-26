import { listAdminUsers } from "@/lib/admin/queries";

export default async function AdminUsersPage() {
  const users = await listAdminUsers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Brukere</h1>
        <p className="text-[12.5px] text-ink-faint">{users.length} bruker(e)</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-semibold">E-post</th>
              <th className="px-4 py-3 font-semibold">Saker</th>
              <th className="px-4 py-3 font-semibold">Registrert</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                <td className="px-4 py-3 font-medium text-ink">{u.email}</td>
                <td className="px-4 py-3 text-ink-soft">{u.caseCount}</td>
                <td className="px-4 py-3 text-ink-faint">{new Date(u.createdAt).toLocaleDateString("no-NO")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="px-4 py-6 text-[13.5px] text-ink-soft">Ingen brukere funnet.</p>}
      </div>
    </div>
  );
}
