import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "E-postadressen er bekreftet",
  description: "E-postadressen din er bekreftet og kontoen er klar til bruk.",
};

export default function KontoBekreftetPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <div className="rounded-lg border border-success-subtle bg-success-subtle p-6">
        <h1 className="text-xl font-semibold text-success-ink">
          E-postadressen din er bekreftet
        </h1>
        <p className="mt-3 text-[14.5px] text-success-ink">
          Kontoen din er klar. Du kan nå logge inn og starte eller fortsette
          en sak.
        </p>
      </div>
      <div className="mt-8">
        <Link
          href="/logg-inn"
          className="flex w-full items-center justify-center rounded-md bg-primary px-[18px] py-[10px] text-sm font-semibold text-white transition-colors hover:bg-primary-ink"
        >
          Logg inn
        </Link>
      </div>
    </main>
  );
}
