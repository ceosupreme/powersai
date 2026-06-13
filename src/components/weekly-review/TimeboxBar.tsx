export function TimeboxBar() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-foreground">⏱ 30-minute weekly review</span>
      <div className="flex gap-2 flex-wrap">
        <span className="px-3 py-1 rounded-full bg-signal-green/10 text-signal-green text-xs font-medium">
          Results (5m)
        </span>
        <span className="px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-medium">
          Risks (10m)
        </span>
        <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium">
          Commitments (15m)
        </span>
      </div>
    </div>
  );
}
