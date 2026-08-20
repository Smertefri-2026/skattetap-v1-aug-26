import Link from "next/link";
import { Wordmark } from "@/components/marketing/Wordmark";
import { AccountMenu } from "./AccountMenu";

export function MinSideHeader({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/min-side">
          <Wordmark tone="on-light" className="text-[15px]" />
        </Link>

        <AccountMenu email={email} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
