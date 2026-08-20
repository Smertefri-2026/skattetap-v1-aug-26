/**
 * Supports the "Hvorfor vi bygget SkatteTap" story: years of documents and
 * case history, gathered and structured through Bevismotoren, into a clear
 * overview. Deliberately distinct from the step-by-step process diagrams
 * used elsewhere (BevismotorPipeline, ProsessFlow) -- this is one vertical
 * illustration, not a labeled flow of UI cards. No stock photo, no
 * person, no AI/robot cliché, no fabricated document text -- only the
 * site's own tones and the document/badge motifs already used elsewhere.
 */
function DocumentCard({
  rotate,
  x,
  y,
  tone,
}: {
  rotate: number;
  x: number;
  y: number;
  tone: "surface" | "primary";
}) {
  const isPrimary = tone === "primary";
  return (
    <g transform={`rotate(${rotate} ${x + 32} ${y + 41})`}>
      <path
        d={`M${x} ${y}h48l16 16v66a2 2 0 0 1-2 2h-62a2 2 0 0 1-2-2V${y + 2}a2 2 0 0 1 2-2Z`}
        className={isPrimary ? "fill-primary-subtle stroke-primary" : "fill-surface stroke-border-strong"}
        strokeWidth="1.5"
      />
      <path d={`M${x + 48} ${y}v14a2 2 0 0 0 2 2h14`} className={isPrimary ? "stroke-primary" : "stroke-border-strong"} strokeWidth="1.5" fill="none" />
      <line x1={x + 12} y1={y + 38} x2={x + 52} y2={y + 38} className={isPrimary ? "stroke-primary-ink" : "stroke-ink-faint"} strokeWidth="2" strokeLinecap="round" />
      <line x1={x + 12} y1={y + 48} x2={x + 44} y2={y + 48} className={isPrimary ? "stroke-primary-ink" : "stroke-ink-faint"} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1={x + 12} y1={y + 58} x2={x + 48} y2={y + 58} className={isPrimary ? "stroke-primary-ink" : "stroke-ink-faint"} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </g>
  );
}

export function CaseHistoryIllustration() {
  return (
    <svg viewBox="0 0 240 320" className="h-full w-full" aria-hidden="true">
      <DocumentCard rotate={-11} x={62} y={22} tone="surface" />
      <DocumentCard rotate={-3} x={78} y={16} tone="surface" />
      <DocumentCard rotate={6} x={94} y={20} tone="primary" />

      <g className="text-ink-faint">
        <line x1="70" y1="130" x2="170" y2="130" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="70" cy="130" r="2" fill="currentColor" />
        <circle cx="170" cy="130" r="2" fill="currentColor" />
      </g>
      <text x="120" y="148" textAnchor="middle" className="fill-ink-soft" fontSize="11" fontWeight="600">
        20+ år med saker og dokumentasjon
      </text>

      <line x1="120" y1="155" x2="120" y2="182" className="stroke-border-strong" strokeWidth="1.5" />

      <circle cx="120" cy="216" r="32" className="fill-primary-subtle stroke-primary" strokeWidth="1.5" />
      <circle cx="120" cy="216" r="21" className="fill-primary" />
      <circle cx="120" cy="216" r="7" className="fill-primary-subtle" />
      <text x="120" y="262" textAnchor="middle" className="fill-primary-ink" fontSize="12" fontWeight="700">
        Bevismotoren
      </text>

      <line x1="120" y1="248" x2="120" y2="266" className="stroke-border-strong" strokeWidth="1.5" />
      <g className="stroke-border-strong" strokeWidth="1.5">
        <line x1="120" y1="266" x2="86" y2="288" />
        <line x1="120" y1="266" x2="120" y2="292" />
        <line x1="120" y1="266" x2="154" y2="288" />
      </g>

      <circle cx="86" cy="292" r="7" className="fill-success-ink" />
      <circle cx="120" cy="296" r="7" className="fill-warning-ink" />
      <circle cx="154" cy="292" r="7" className="fill-neutral-ink" />
    </svg>
  );
}
