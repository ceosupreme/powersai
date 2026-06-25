import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';
import { useFoundationScores } from './useFoundationScores';

const SEV_TONE: Record<string, string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/40',
  high: 'bg-amber-500/15 text-amber-600 border-amber-500/40',
  medium: 'bg-blue-500/15 text-blue-600 border-blue-500/40',
  low: 'bg-muted text-muted-foreground border-border',
};

export const FoundationGapsView = () => {
  const { selectedBar } = useApp();
  const venueId = selectedBar?.id ?? null;
  const { result } = useFoundationScores(venueId);

  if (!selectedBar) {
    return (
      <Card className="p-10 text-center bg-card/30 border-dashed">
        <p className="text-sm text-muted-foreground">Select a project to view foundation gaps.</p>
      </Card>
    );
  }

  const gaps = result?.categories.flatMap((c) =>
    c.gaps.map((g) => ({ ...g, categoryLabel: c.label })),
  ) ?? [];

  if (gaps.length === 0) {
    return (
      <Card className="p-10 text-center bg-card/30 border-dashed">
        <p className="text-sm text-muted-foreground">No gaps detected. Everything that's been evaluated is satisfied.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-foreground mb-3">All gaps ({gaps.length})</h2>
      <ul className="space-y-2">
        {gaps.map((g) => (
          <li key={g.item_key} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card/40">
            <Badge variant="outline" className={`text-[10px] uppercase ${SEV_TONE[g.severity] ?? ''}`}>
              {g.severity}
            </Badge>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{g.label}</div>
              <div className="text-xs text-muted-foreground">
                {g.categoryLabel} · {g.status}
                {g.is_manual_only ? ' · manual' : ''}
              </div>
              {g.recommended_fix && (
                <div className="text-xs text-muted-foreground mt-1">{g.recommended_fix}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
};