import Link from "next/link";

export function MinSideHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/min-side" className="text-[15px] font-semibold text-ink">
          Skattetap<span className="text-primary">.no</span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-[13px] text-ink-faint">{email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-[13.5px] font-semibold text-ink-soft hover:text-ink"
            >
              Logg ut
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
