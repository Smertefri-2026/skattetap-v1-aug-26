import Link from "next/link";

export function SaksbehandlerCallout({ caseId }: { caseId: string }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface-alt p-4">
      <div>
        <p className="text-[13.5px] font-semibold text-ink">Har du spørsmål om saken?</p>
        <p className="text-[12.5px] text-ink-soft">
          Min saksbehandler kjenner hele saken -- dokumenter, tidslinje, konflikter og hva som mangler.
        </p>
      </div>
      <Link
        href={`/min-side/saker/${caseId}?steg=saksbehandler`}
        className="shrink-0 rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-ink"
      >
        Spør Min saksbehandler
      </Link>
    </section>
  );
}
