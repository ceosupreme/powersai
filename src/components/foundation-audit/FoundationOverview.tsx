import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useFoundationScores, useRefreshFoundationAudit } from './useFoundationScores';
import { FoundationCategoryCard } from './FoundationCategoryCard';

const SEV_TONE: Record<string, string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/40',
  high: 'bg-amber-500/15 text-amber-600 border-amber-500/40',
  medium: 'bg-blue-500/15 text-blue-600 border-blue-500/40',
  low: 'bg-muted text-muted-foreground border-border',
};

const formatRunLabel = (iso: string | null): string => {
  if (!iso) return 'No audit run yet';
  const d = new Date(iso);
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
  const ago = days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${ago}`;
};

export const FoundationOverview = () => {
  const { selectedBar } = useApp();
  const venueId = selectedBar?.id ?? null;
  const { toast } = useToast();
  const { result, isLoading, lastRunAt, projectType } = useFoundationScores(venueId);
  const refresh = useRefreshFoundationAudit(venueId);

  if (!selectedBar) {
    return (
      <Card className="p-10 text-center bg-card/30 border-dashed">
        <h2 className="text-lg font-semibold text-foreground">Select a project</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a project from the global header to see Foundation Audit data.
        </p>
      </Card>
    );
  }

  const handleRefresh = () => {
    refresh.mutate(undefined, {
      onSuccess: (d: any) =>
        toast({ title: 'Audit refreshed', description: `${d?.summary?.totalSuccess ?? 0} checks ran.` }),
      onError: (e: any) =>
        toast({ title: 'Refresh failed', description: e?.message ?? 'Unknown error', variant: 'destructive' }),
    });
  };

  const overall = result?.overall ?? null;
  const overallTone =
    overall === null ? 'text-muted-foreground'
    : overall >= 85 ? 'text-emerald-600'
    : overall >= 70 ? 'text-amber-600'
    : 'text-destructive';

  return (
    <div className="space-y-6">
      <Card className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-l-4 border-l-sky-500/70">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Project</div>
          <div className="text-lg font-semibold text-foreground">{selectedBar.bar_name}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Last refresh: {formatRunLabel(lastRunAt)}
            {projectType ? <> · vertical: <span className="font-mono">{projectType}</span></> : null}
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={refresh.isPending || isLoading} className="gap-2">
          {refresh.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh audit
        </Button>
      </Card>

      <Card className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Foundation Readiness</div>
          <div className={`text-5xl font-bold mt-1 ${overallTone}`}>{overall ?? '—'}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {result
              ? `${result.totals.satisfied}/${result.totals.total} items satisfied · ${result.totals.missing} missing · ${result.totals.unknown} not yet evaluated`
              : '—'}
          </div>
          {result && result.unscoredCategoryCount > 0 && (
            <Badge variant="outline" className="mt-2 text-[10px] border-border text-muted-foreground">
              {result.unscoredCategoryCount} categor{result.unscoredCategoryCount === 1 ? 'y' : 'ies'} unscored — needs answers
            </Badge>
          )}
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Category Scores</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(result?.categories ?? []).map((c) => (
            <FoundationCategoryCard key={c.category_key} cat={c} />
          ))}
        </div>
      </div>

      {result && result.recommendedActions.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" /> Recommended next actions
          </h2>
          <ul className="space-y-2">
            {result.recommendedActions.map((g) => (
              <li key={g.item_key} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card/40">
                <Badge variant="outline" className={`text-[10px] uppercase ${SEV_TONE[g.severity] ?? ''}`}>
                  {g.severity}
                </Badge>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{g.label}</div>
                  {g.recommended_fix && (
                    <div className="text-xs text-muted-foreground mt-0.5">{g.recommended_fix}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};