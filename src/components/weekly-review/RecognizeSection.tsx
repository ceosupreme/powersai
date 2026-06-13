
interface RecognizeSectionProps {
  wins: string | null;
}

function toPraise(win: string): string {
  // Strip data-report phrasing and reframe as team praise
  let simplified = win
    .replace(/^[•\-]\s*/, '')
    .replace(/indicators?\s+(improved|increased|decreased)\s+across\s+/i, '')
    .replace(/suggesting\s+better\s+/i, '')
    .replace(/,?\s*which\s+suggests?\s+/i, ', ')
    .trim();
  // Take the key fact (before the first comma or colon if long)
  if (simplified.length > 80) {
    const cut = simplified.indexOf(',');
    if (cut > 20) simplified = simplified.substring(0, cut).trim();
  }
  // Lowercase the first char for natural reading
  simplified = simplified.charAt(0).toLowerCase() + simplified.slice(1);
  return `Great job from the team — ${simplified}`;
}

export function RecognizeSection({ wins }: RecognizeSectionProps) {
  const winsList = wins
    ? wins.split('\n').map(l => l.replace(/^[•\-]\s*/, '').trim()).filter(l => l.length > 0)
    : [];

  const praiseLines = winsList.map(toPraise);

  if (praiseLines.length === 0) return null;

  return (
    <div className="bg-card border border-signal-green/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎉</span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-signal-green">Recognize This Week</h3>
      </div>
      <ul className="space-y-1.5">
        {praiseLines.map((praise, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <span className="text-signal-green mt-0.5">•</span>
            <span>{praise}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
