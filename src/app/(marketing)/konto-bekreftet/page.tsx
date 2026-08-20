import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "E-postadressen er bekreftet",
  description: "E-postadressen din er bekreftet og kontoen er klar til bruk.",
};

export default async function KontoBekreftetPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // exchangeCodeForSession already ran in /auth/confirm before redirecting
  // here, so the session cookie is already set -- this link continues
  // straight to the destination rather than sending an already-logged-in
  // visitor through the login form again.
  const continueHref = next && next.startsWith("/") ? next : "/min-side";

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <div className="rounded-lg border border-success-subtle bg-success-subtle p-6">
        <h1 className="text-xl font-semibold text-success-ink">
          E-postadressen din er bekreftet
        </h1>
        <p className="mt-3 text-[14.5px] text-success-ink">
          Kontoen din er klar. Du kan nå starte eller fortsette en sak.
        </p>
      </div>
      <div className="mt-8">
        <Link
          href={continueHref}
          className="flex w-full items-center justify-center rounded-md bg-primary px-[18px] py-[10px] text-sm font-semibold text-white transition-colors hover:bg-primary-ink"
        >
          Fortsett
        </Link>
      </div>
    </main>
  );
}
