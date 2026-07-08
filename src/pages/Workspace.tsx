// Unified Workspace ("Today") — front-door digest pulling highlights from
// the operational scorecard, Growth Audit, and Marketing Hub into one view.
// Read-only: deep work happens in the dedicated specialized surfaces.

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sunrise, ArrowRight, RefreshCw, Plus, Sparkles, Activity,
  TrendingUp, ShieldAlert, Megaphone, AlertTriangle, Loader2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAlerts } from '@/hooks/useVenueData';
import { useSupabaseWeeks } from '@/hooks/useSupabaseWeekData';
import { useGrowthScores, useRefreshAudit } from '@/components/growth-audit/useGrowthScores';
import { useFindings } from '@/components/growth-audit/findings/useFindings';
import { useCampaignStore } from '@/components/marketing-hub/useCampaignStore';
import { GateBadge, computeGateState } from '@/components/growth-audit/GateBadge';
import { getScoreBand } from '@/components/growth-audit/scoreBands';
import { NewCampaignDialog } from '@/components/marketing-hub/NewCampaignDialog';
import { QuickGenerateDialog } from '@/components/growth-audit/action-packs/QuickGenerateDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { OnboardingChecklist } from '@/components/growth-audit/onboarding/OnboardingChecklist';
import { UpcomingOpportunitiesWidget } from '@/components/growth-audit/context/UpcomingOpportunitiesWidget';
import { HelpTip } from '@/components/help/HelpTip';
import { SuggestionsPanel } from '@/components/help/SuggestionsPanel';
import { HELP_KEYS } from '@/config/helpKeys';

const fmtScore = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toString());

const Tile = ({
  label, value, hint, icon: Icon, accent, footer,
}: {
  label: string; value: string; hint?: string; icon: any;
  accent?: string; footer?: React.ReactNode;
}) => (
  <Card className="p-4 flex flex-col gap-1.5">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <div className={cn('text-2xl font-semibold', accent ?? 'text-foreground')}>{value}</div>
    {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    {footer}
  </Card>
);

const Workspace = () => {
  const { selectedBar, selectedWeek, supabaseBarId } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const venueId = selectedBar?.id ?? null;

  // Data
  const { data: weeks = [] } = useSupabaseWeeks(supabaseBarId || undefined);
  const currentWeek = useMemo(
    () => (selectedWeek ? weeks.find(w => w.week_start === selectedWeek.week_start) : null),
    [weeks, selectedWeek],
  );
  const scorecard = currentWeek?.scorecard ?? null;
  const { data: alerts = [] } = useAlerts(supabaseBarId || undefined, selectedWeek?.id);
  const { primary, isLoading: growthLoading } = useGrowthScores(venueId);
  const findingsQ = useFindings(venueId);
  const { campaigns } = useCampaignStore();
  const refresh = useRefreshAudit(venueId);

  // Local UI state
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  if (!selectedBar) {
    return (
      <Card className="p-10 text-center bg-card/30 border-dashed">
        <h2 className="text-lg font-semibold text-foreground">Select a project</h2>
        <p className="text-sm text-muted-foreground mt-1">Pick a project from the global header to see your workspace.</p>
      </Card>
    );
  }

  // Header tiles
  const opsScore = scorecard?.overall_score ?? null;
  const opsGrade = scorecard?.overall_grade ?? null;
  const growthScore = primary.growthScore;
  const growthBand = getScoreBand(growthScore ?? 0);

  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
  const venueCampaigns = campaigns.filter(c => c.venueId === venueId);
  const live = venueCampaigns.filter(c => c.status === 'Live');
  const scheduled = venueCampaigns.filter(c => c.status === 'Scheduled' && c.startDate <= in7);
  const endingSoon = venueCampaigns.filter(c =>
    c.status === 'Live' && c.endDate >= today && c.endDate <= in7
  );
  const failedSync = venueCampaigns.filter(c => c.executionAdapter?.sync_status === 'Sync Failed');

  const findings = findingsQ.data ?? [];
  const activeFindings = findings.filter(f => f.status !== 'Resolved' && f.status !== 'Dismissed');
  const sevRank: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const topFindings = [...activeFindings]
    .sort((a, b) => (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9) || b.priorityScore - a.priorityScore)
    .slice(0, 5);
  const criticalFindings = activeFindings.filter(f => f.severity === 'Critical');

  const opsAlerts = [...alerts]
    .sort((a, b) => {
      const o: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      return (o[a.severity] ?? 3) - (o[b.severity] ?? 3);
    })
    .slice(0, 5);

  const showCriticalChip = primary.readiness === 'Needs Ops Fix First'
    || criticalFindings.length > 0
    || failedSync.length > 0;

  const venueCtx = { venueId: selectedBar.id, venueName: selectedBar.bar_name, city: selectedBar.city };

  const handleRefresh = () => {
    refresh.mutate(undefined, {
      onSuccess: () => toast({ title: 'Audit refresh queued' }),
      onError: (e: any) => toast({ title: 'Refresh failed', description: e?.message ?? 'Unknown error', variant: 'destructive' }),
    });
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3 border-l-4 border-l-primary/70 pl-4">
        <div className="p-2.5 rounded-xl bg-primary/15 text-primary">
          <Sunrise className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Today</h1>
          <p className="text-xs text-muted-foreground">
            {selectedBar.bar_name} · digest of operations, growth, and marketing
          </p>
        </div>
        {showCriticalChip && (
          <Badge variant="outline" className="gap-1.5 text-xs bg-destructive/10 text-destructive border-destructive/30">
            <AlertTriangle className="w-3 h-3" /> Critical attention needed
          </Badge>
        )}
      </div>

      <OnboardingChecklist venueId={venueId} />

      <HelpTip helpKey={HELP_KEYS.pillarsByType} title="Why pillars differ by project">
        Pillars come from the project's type (pillar_templates) plus any per-project overrides. A content-channel project will surface a different set of pillars than a client venue — that's intentional, not a glitch.
      </HelpTip>

      <SuggestionsPanel hideWhenEmpty />

      {/* Header strip — 4 tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          icon={Activity} label="Operational score"
          value={fmtScore(opsScore)}
          hint={opsGrade ? `Grade ${opsGrade}` : 'Awaiting weekly scorecard'}
        />
        <Tile
          icon={TrendingUp} label="Growth score"
          value={growthLoading ? '…' : growthScore === null ? '—' : String(growthScore)}
          accent={growthBand.text}
          hint={primary.opportunityLevel + ' opportunity'}
        />
        <Tile
          icon={ShieldAlert} label="Ops Readiness"
          value={primary.readiness}
          footer={
            <div className="mt-1">
              <GateBadge state={computeGateState(true, primary.readiness)} />
            </div>
          }
        />
        <Tile
          icon={Megaphone} label="Active campaigns"
          value={`${live.length} live`}
          hint={`${scheduled.length} scheduled this week`}
        />
      </div>

      {/* Quick actions */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleRefresh} disabled={refresh.isPending} className="gap-1.5">
          {refresh.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Run Audit Now
        </Button>
        <Button size="sm" variant="outline" onClick={() => setNewCampaignOpen(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Create Campaign
        </Button>
        <Button size="sm" variant="outline" onClick={() => setQuickOpen(true)} className="gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Quick Generate
        </Button>
      </Card>

      {/* Today's Priorities */}
      <Card className="p-4 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Today's priorities</h2>

        {/* Operational */}
        <PrioritySection
          title="Operational"
          empty="No operational alerts this week."
          viewAllHref="/dashboard"
          items={opsAlerts.map(a => ({
            key: a.id,
            severity: a.severity as 'High' | 'Medium' | 'Low',
            title: a.metric_name,
            chip: a.pillar,
            sub: a.message,
          }))}
        />

        {/* Growth findings */}
        <PrioritySection
          title="Growth findings"
          empty="No active findings — clean slate."
          viewAllHref="/growth-audit?subtab=findings"
          items={topFindings.map(f => ({
            key: f.id,
            severity: (f.severity === 'Critical' ? 'High' : f.severity) as 'High' | 'Medium' | 'Low',
            title: f.title,
            chip: f.category,
            sub: f.gateReason,
            onClick: () => navigate(`/growth-audit?subtab=findings&finding=${f.id}`),
          }))}
        />

        {/* Campaigns needing attention */}
        <PrioritySection
          title="Campaigns needing attention"
          empty="Nothing pressing."
          viewAllHref="/marketing-hub?subtab=campaigns"
          items={[
            ...failedSync.map(c => ({ key: `sf-${c.id}`, severity: 'High' as const, title: c.title, chip: 'Sync failed', sub: c.venueName, onClick: () => navigate(`/marketing-hub?subtab=campaigns&open=${c.id}`) })),
            ...endingSoon.map(c => ({ key: `es-${c.id}`, severity: 'Medium' as const, title: c.title, chip: `Ends ${c.endDate}`, sub: c.venueName, onClick: () => navigate(`/marketing-hub?subtab=campaigns&open=${c.id}`) })),
            ...venueCampaigns.filter(c => c.needsDetails).slice(0, 3).map(c => ({ key: `nd-${c.id}`, severity: 'Medium' as const, title: c.title, chip: 'Needs details', sub: c.venueName, onClick: () => navigate(`/marketing-hub?subtab=campaigns&open=${c.id}`) })),
          ].slice(0, 5)}
        />
      </Card>

      <UpcomingOpportunitiesWidget venueId={venueId} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DrillLink to="/dashboard" label="Operational scorecard" sub="Full 4-pillar / 16-signal view" />
        <DrillLink to="/growth-audit?subtab=findings" label="Growth Audit" sub="All findings, categories, action center" />
        <DrillLink to="/marketing-hub?subtab=campaigns" label="Marketing Hub" sub="Campaigns, calendar, results" />
      </div>

      <NewCampaignDialog open={newCampaignOpen} onOpenChange={setNewCampaignOpen} />
      <QuickGenerateDialog open={quickOpen} onOpenChange={setQuickOpen} venueContext={venueCtx} />
    </div>
  );
};

const sevTone = (s: 'High' | 'Medium' | 'Low') =>
  s === 'High' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : s === 'Medium' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
  : 'bg-muted text-muted-foreground border-border';

type PriorityItem = {
  key: string;
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  chip?: string;
  sub?: string;
  onClick?: () => void;
};

const PrioritySection = ({
  title, items, empty, viewAllHref,
}: {
  title: string; items: PriorityItem[]; empty: string; viewAllHref: string;
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <Link to={viewAllHref} className="text-xs text-primary hover:underline flex items-center gap-1">
        View all <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
    {items.length === 0 ? (
      <div className="text-xs text-muted-foreground italic">{empty}</div>
    ) : (
      <div className="space-y-1.5">
        {items.map(i => (
          <button
            key={i.key}
            onClick={i.onClick}
            disabled={!i.onClick}
            className={cn(
              'w-full text-left p-2 rounded-md flex items-start gap-2 border border-transparent',
              i.onClick && 'hover:bg-muted/40 hover:border-border transition',
            )}
          >
            <Badge variant="outline" className={cn('text-[10px] mt-0.5 shrink-0', sevTone(i.severity))}>
              {i.severity}
            </Badge>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground truncate">{i.title}</div>
              {(i.chip || i.sub) && (
                <div className="text-[11px] text-muted-foreground truncate">
                  {i.chip && <span className="mr-2">{i.chip}</span>}
                  {i.sub && <span>{i.sub}</span>}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
);

const DrillLink = ({ to, label, sub }: { to: string; label: string; sub: string }) => (
  <Link to={to}>
    <Card className="p-3 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </Card>
  </Link>
);

export default Workspace;
