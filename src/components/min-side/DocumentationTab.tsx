import Link from "next/link";
import { Badge } from "@/components/design-system";
import { createClient } from "@/lib/supabase/server";

const statusBadge: Record<string, { tone: "info" | "success" | "danger" | "neutral"; label: string }> = {
  pending: { tone: "neutral", label: "Venter" },
  extracting: { tone: "info", label: "Analyserer" },
  done: { tone: "success", label: "Analysert" },
  failed: { tone: "danger", label: "Feilet" },
};

export async function DocumentationTab() {
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("id, original_filename, extraction_status, case_id, cases(title)")
    .order("uploaded_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[16px] font-semibold text-ink">Dokumentasjon</h2>

      {!documents || documents.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-alt p-8 text-center">
          <p className="text-[14.5px] text-ink-soft">
            Dokumenter fra alle sakene dine vises her når du har lastet opp noe.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((doc) => {
            const badge = statusBadge[doc.extraction_status] ?? statusBadge.pending;
            return (
              <li key={doc.id}>
                <Link
                  href={`/min-side/saker/${doc.case_id}?steg=full-sjekk`}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface p-5 shadow-sm hover:border-border-strong"
                >
                  <div>
                    <p className="text-[14.5px] font-semibold text-ink">{doc.original_filename}</p>
                    <p className="mt-1 text-[12.5px] text-ink-faint">
                      {(doc.cases as unknown as { title: string } | null)?.title ?? "Sak"}
                    </p>
                  </div>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
