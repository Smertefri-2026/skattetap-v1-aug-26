export interface EvidenceStat {
  label: string;
  value: number | string;
  tone?: "default" | "warning";
}

/**
 * The "vi fant dette" moment, generic enough to reuse anywhere a product
 * tier wants to show what Evidence Engine actually found -- every number
 * passed in must come from real counts (claims, timeline, gaps, conflicts,
 * rule matches), never a decorative or invented figure. This component
 * only lays the numbers out; it has no opinion about what they mean.
 */
export function EvidenceStatsGrid({
  title,
  subtitle,
  stats,
}: {
  title: string;
  subtitle?: string;
  stats: EvidenceStat[];
}) {
  return (
    <section className="rounded-lg border border-primary bg-primary-subtle p-5">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-primary-ink">{title}</p>
      {subtitle && <p className="mt-1 text-[12.5px] text-primary-ink">{subtitle}</p>}
      <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label}>
            <p className={`text-[24px] font-semibold ${s.tone === "warning" ? "text-warning-ink" : "text-ink"}`}>
              {s.value}
            </p>
            <p className="text-[11.5px] text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
