import Link from "next/link";
import { Badge } from "@/components/design-system";
import type { BadgeTone } from "@/components/design-system";
import type { SimpleCheckResult } from "@/lib/ai/simpleCheck";

const strengthTone: Record<SimpleCheckResult["case_strength"], BadgeTone> = {
  lovende: "success",
  usikkert: "warning",
  lite_sannsynlig: "neutral",
};

const strengthLabel: Record<SimpleCheckResult["case_strength"], string> = {
  lovende: "Lovende",
  usikkert: "Usikkert",
  lite_sannsynlig: "Lite sannsynlig",
};

export function SimpleCheckResultView({
  result,
  caseId,
}: {
  result: SimpleCheckResult;
  caseId: string;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="info">KI-vurdering</Badge>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink">{result.understood_summary}</p>
        </div>
        {result.estimated_range_kr && (
          <div className="shrink-0 rounded-md bg-primary-subtle px-4 py-3 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-ink">Mulig spenn</p>
            <p className="mt-0.5 text-[20px] font-semibold text-ink">
              {result.estimated_range_kr.low_kr.toLocaleString("no-NO")}–
              {result.estimated_range_kr.high_kr.toLocaleString("no-NO")} kr
            </p>
          </div>
        )}
      </div>

      {result.case_strength && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-md bg-surface-alt p-4">
          <Badge tone={strengthTone[result.case_strength]}>{strengthLabel[result.case_strength]}</Badge>
          <p className="text-[13.5px] text-ink-soft">{result.case_strength_reasoning}</p>
        </div>
      )}

      {result.estimated_range_kr && (
        <p className="text-[12px] text-ink-faint">Grunnlag for spennet: {result.estimated_range_kr.basis}</p>
      )}

      {result.things_to_investigate.length > 0 && (
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
            Mulige forhold å undersøke
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {result.things_to_investigate.map((item) => (
              <li key={item} className="text-[13.5px] text-ink-soft">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.missing_information.length > 0 && (
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
            Hva som mangler
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {result.missing_information.map((item) => (
              <li key={item} className="text-[13.5px] text-ink-soft">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-md bg-surface-alt p-4">
        <div className="flex items-center gap-2">
          <Badge tone={result.full_check_recommended ? "success" : "neutral"}>
            {result.full_check_recommended
              ? "Kan være grunnlag for Full sjekk"
              : "Trolig ikke grunnlag ennå"}
          </Badge>
        </div>
        <p className="mt-2 text-[13.5px] text-ink-soft">{result.full_check_reasoning}</p>
      </div>

      {result.full_check_recommended && (
        <Link
          href={`/min-side/saker/${caseId}?steg=full-sjekk`}
          className="inline-flex w-fit rounded-md bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-ink"
        >
          Gå videre til Full sjekk
        </Link>
      )}

      <p className="text-[12px] text-ink-faint">
        Dette er en KI-vurdering, ikke en juridisk konklusjon.
      </p>
    </div>
  );
}
