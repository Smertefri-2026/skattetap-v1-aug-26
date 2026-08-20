import Link from "next/link";
import type { Metadata } from "next";
import { ProsessFlow } from "@/components/marketing/ProsessFlow";

export const metadata: Metadata = {
  title: "Slik fungerer det",
  description: "Fra første spørsmål til ferdig rapport -- se hva som faktisk skjer når du bruker SkatteTap.",
};

interface JourneyStep {
  n: number;
  title: string;
  body: string;
}

interface JourneyGroup {
  eyebrow: string;
  steps: JourneyStep[];
}

const groups: JourneyGroup[] = [
  {
    eyebrow: "Kom i gang",
    steps: [
      {
        n: 1,
        title: "Start med Enkel sjekk",
        body: "Fortell kort hva saken gjelder -- hvilket år, hvilken type skatt, og en kort forklaring med egne ord. Du får en vurdering med en gang. Helt gratis, og du trenger ingen dokumenter for å komme i gang.",
      },
      {
        n: 2,
        title: "Saken din opprettes automatisk",
        body: "Enkel sjekk blir til en egen sak du kan bygge videre på. Alt du legger inn samles ett sted, og du kommer tilbake til den akkurat der du slapp.",
      },
      {
        n: 3,
        title: "Last opp dokumentene dine",
        body: "Vedtak, kvitteringer, avtaler, brev -- du bestemmer selv hva som lastes opp, og du kan legge til mer etter hvert som du finner det.",
      },
    ],
  },
  {
    eyebrow: "SkatteTap jobber for deg",
    steps: [
      {
        n: 4,
        title: "Dokumentasjonen analyseres",
        body: "Hvert dokument brytes ned til konkrete fakta -- datoer, beløp, påstander -- og sjekkes opp mot det som allerede er kjent i saken. Motsier to dokumenter hverandre, vises det tydelig, med en forklaring. Mangler det noe, sier vi konkret hva.",
      },
      {
        n: 5,
        title: "Levende saksbilde oppdateres",
        body: "Alt samles i ett bilde som alltid viser status akkurat nå: hvor mye som er dokumentert, hva som er usikkert, hvilke konflikter som finnes, og hva som gjenstår. Ikke noe du må generere på nytt -- det oppdaterer seg selv etter hvert som saken vokser.",
      },
      {
        n: 6,
        title: "Min saksbehandler hjelper deg videre",
        body: "Har du spørsmål underveis? Min saksbehandler kjenner hele saken din -- dokumentene, tidslinjen, konfliktene og hullene -- og svarer direkte, med henvisning til akkurat det som gjelder din sak.",
      },
    ],
  },
  {
    eyebrow: "Du bestemmer tempoet",
    steps: [
      {
        n: 7,
        title: "Gå videre når du er klar",
        body: "Full sjekk for en strukturert rapport. Skatteendring for å formulere en henvendelse til Skatteetaten. Komplett sak for en dypere analyse. Strategisk utredning hvis du har flere saker over tid. Du velger selv hvor langt du vil gå -- ingenting tvinger deg videre.",
      },
      {
        n: 8,
        title: "Rapportene er øyeblikksbilder",
        body: "Hver rapport du genererer er et øyeblikksbilde av saken slik den så ut akkurat da -- låst, nedlastbar, og alltid tilgjengelig i historikken. Endrer saken seg senere, genererer du bare en ny -- den gamle blir liggende uendret.",
      },
    ],
  },
];

export default function SlikFungererDetPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold text-ink">Slik fungerer det</h1>
      <p className="mt-4 max-w-xl text-[15.5px] text-ink-soft">
        Fra første spørsmål til ferdig rapport -- se hva som faktisk skjer når du bruker
        SkatteTap.
      </p>

      <div className="mt-12 flex flex-col gap-12">
        {groups.map((group, groupIndex) => (
          <div key={group.eyebrow}>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                {group.eyebrow}
              </p>
              <div className="mt-5 flex flex-col gap-8">
                {group.steps.map((step) => (
                  <div key={step.n} className="flex gap-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-[13px] font-semibold text-ink-soft">
                      {step.n}
                    </div>
                    <div>
                      <h2 className="text-[17px] font-semibold text-ink">{step.title}</h2>
                      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{step.body}</p>
                      {step.n === 4 && (
                        <div className="mt-4 rounded-md border border-primary bg-primary-subtle px-4 py-3">
                          <p className="text-[12.5px] text-primary-ink">
                            Dette er kjernen i det vi kaller <span className="font-semibold">Bevismotoren</span>:
                            systemet gjetter aldri. Det dokumenterer hver påstand til kilden, begrunner hver
                            vurdering, og sier tydelig fra når noe mangler.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {groupIndex === 1 && (
              <div className="mt-10 rounded-lg border border-border bg-surface-alt p-6">
                <p className="text-center text-[13px] font-medium text-ink-soft">
                  Slik henger det sammen i praksis:
                </p>
                <div className="mt-5">
                  <ProsessFlow />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-lg border border-border bg-surface-alt p-6">
        <p className="text-[14px] text-ink-soft">
          SkatteTap gir deg en strukturert vurdering, ikke en juridisk fasit.
          Vi garanterer ikke noe bestemt resultat i saken din.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/logg-inn?tab=registrer"
          className="inline-flex rounded-md bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-ink"
        >
          Start enkel sjekk
        </Link>
        <Link
          href="/eksempel"
          className="inline-flex rounded-md border border-border-strong bg-surface px-6 py-3 text-[14.5px] font-semibold text-ink hover:bg-surface-alt"
        >
          Se eksempelrapport
        </Link>
      </div>
    </main>
  );
}
