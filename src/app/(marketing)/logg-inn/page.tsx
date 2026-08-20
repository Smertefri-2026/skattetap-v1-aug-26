import type { Metadata } from "next";
import { AuthTabs } from "@/components/marketing/AuthTabs";

export const metadata: Metadata = {
  title: "Logg inn eller registrer deg",
  description: "Logg inn eller opprett en konto for å starte eller fortsette en sak.",
};

const trustPoints = [
  "Gratis å starte",
  "Ingen garantier — kun det som faktisk er dokumentert",
  "Du bestemmer hva som lastes opp",
];

export default async function LoggInnPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; next?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params.tab === "registrer" ? "registrer" : "logg-inn";
  const next = params.next && params.next.startsWith("/") ? params.next : undefined;

  return (
    <main className="mx-auto max-w-4xl px-6 py-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Velkommen</h1>
          <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed text-ink-soft">
            Logg inn eller opprett en konto for å starte eller fortsette en sak.
          </p>

          <p className="mt-8 max-w-xs text-[13.5px] leading-relaxed text-ink-soft">
            SkatteTap dokumenterer, begrunner og sier fra når noe mangler — aldri gjetting.
          </p>

          <ul className="mt-6 flex flex-col gap-2">
            {trustPoints.map((point) => (
              <li key={point} className="text-[12.5px] text-ink-faint">
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <AuthTabs initialTab={initialTab} next={next} />
        </div>
      </div>
    </main>
  );
}
