export function EmptyTab({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
      <div className="rounded-lg border border-border bg-surface-alt p-8 text-center">
        <p className="text-[14.5px] text-ink-soft">{body}</p>
      </div>
    </div>
  );
}
