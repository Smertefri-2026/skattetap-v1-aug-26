import type { Metadata } from "next";
import { AuthTabs } from "@/components/marketing/AuthTabs";

export const metadata: Metadata = {
  title: "Logg inn eller registrer deg",
  description: "Logg inn eller opprett en konto for å starte eller fortsette en sak.",
};

export default async function LoggInnPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params.tab === "registrer" ? "registrer" : "logg-inn";

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-semibold text-ink">Velkommen</h1>
      <p className="mt-3 text-[14.5px] text-ink-soft">
        Logg inn eller opprett en konto for å starte eller fortsette en sak.
      </p>
      <div className="mt-8">
        <AuthTabs initialTab={initialTab} />
      </div>
    </main>
  );
}
