import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, ShieldAlert, Loader2 } from 'lucide-react';
import { PrimaryMetricsRow } from './PrimaryMetricsRow';
import { CategoryScoreGrid } from './CategoryScoreGrid';
import { TopPrioritiesList } from './TopPrioritiesList';
import { QuickStatsStrip } from './QuickStatsStrip';
import { useGrowthScores, useRefreshAudit } from './useGrowthScores';
import { OnboardingChecklist } from './onboarding/OnboardingChecklist';

export const OverviewView = () => {
  const { selectedBar } = useApp();
  const [, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const venueId = selectedBar?.id ?? null;
  const { primary, categories, priorities, quickStats, isLoading } = useGrowthScores(venueId);
  const refresh = useRefreshAudit(venueId);

  if (!selectedBar) {
    return (
      <Card className="p-10 text-center bg-card/30 border-dashed">
        <h2 className="text-lg font-semibold text-foreground">Select a venue</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a venue from the global header to see Growth Audit data.
        </p>
      </Card>
    );
  }

  const handleRefresh = () => {
    refresh.mutate(undefined, {
      onSuccess: () => toast({ title: 'Audit refreshed', description: 'Continuous analyzers will fill in here once wired.' }),
      onError: (e: any) => toast({ title: 'Refresh failed', description: e?.message ?? 'Unknown error', variant: 'destructive' }),
    });
  };

  return (
    <div className="space-y-6">
      <OnboardingChecklist venueId={venueId} />
      {/* Header strip */}
      <Card className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-l-4 border-l-emerald-500/70">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Venue</div>
          <div className="text-lg font-semibold text-foreground">{selectedBar.bar_name}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Last refresh: {primary.lastRunLabel}
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={refresh.isPending || isLoading} className="gap-2">
          {refresh.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <RefreshCw className="w-4 h-4" />}
          Refresh Now
        </Button>
      </Card>

      <PrimaryMetricsRow
        data={primary}
        onViewDataSources={() => setSearchParams({ subtab: 'data-sources' })}
      />

      {/* Ops Readiness Gate principle banner — the differentiator */}
      <div
        id="ops-gate-principle"
        className="rounded-lg border border-accent/40 bg-accent/10 p-3 flex items-start gap-3 scroll-mt-24"
      >
        <div className="p-1.5 rounded-md bg-accent/20 text-accent-foreground shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex-1 text-xs leading-relaxed">
          <div className="font-semibold text-foreground">
            Traffic-driving campaigns are gated by Ops Readiness.
          </div>
          <div className="text-muted-foreground mt-0.5">
            Supreme Team Media won't push covers a venue can't serve. Findings that drive traffic carry the
            current gate status; operational, reputation, content, and conversion fixes are never gated.
          </div>
        </div>
      </div>

      <CategoryScoreGrid categories={categories} />

      <TopPrioritiesList items={priorities} gate={primary.readiness} />

      <QuickStatsStrip stats={quickStats} />

      {!isLoading && priorities.length === 0 && (
        <Badge variant="outline" className="text-[10px]">No active findings — clean slate</Badge>
      )}
    </div>
  );
};
