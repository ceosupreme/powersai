import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OWNERSHIP_OPTIONS, OWNERSHIP_LABELS } from '@/hooks/useContentProduction';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowRight, Settings, ClipboardCheck, TrendingUp, Inbox, FileText, Palette,
  Loader2, PlayCircle, ChevronDown,
} from 'lucide-react';
import { VenueOnboardingWizard } from '@/components/onboarding/VenueOnboardingWizard';
import { VenueLiveBadge } from '@/components/onboarding/VenueLiveBadge';
import { ProjectCaptureLinkCard } from '@/components/onboarding/ProjectCaptureLinkCard';
import { EmailDeliveryModeCard } from '@/components/onboarding/EmailDeliveryModeCard';
import { ProposalsListCard } from '@/components/proposals/ProposalsListCard';
import { useVenueOnboardingDetectors } from '@/hooks/useVenueOnboardingDetectors';
import { useVenueLiveStatus } from '@/hooks/useVenueLiveStatus';
import { useEffectivePillars } from '@/hooks/useEffectivePillars';
import { useEnsureCurrentWeek, currentWeekRange } from '@/hooks/useEnsureCurrentWeek';
import { NonClientPillarsDashboard } from '@/components/pillar/NonClientPillarsDashboard';
import { NextTenSection } from '@/components/pillar/NextTenSection';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { VENUE_ONBOARDING_STEPS } from '@/config/venueOnboardingSteps';
import { CLIENT_PROJECT_TYPE } from '@/lib/effectivePillars';
import type { ProjectType } from '@/lib/effectivePillars';


interface ProjectMeta {
  id: string;
  name: string;
  project_type: ProjectType | null;
  bar_code: string | null;
  slug: string | null;
  north_star: string | null;
  monetization_model: string | null;
  focus_status: string | null;
  ownership: string | null;
}

const STM_PROJECT_ID = '34cb1836-6ead-4478-915c-0a9dc552a554';

type WebsiteStats = {
  pageViews: number;
  ctaClicks: number;
  callRequests: number;
  inquiries: Record<string, number>;
  firstResponseRate: number | null;
};

const QUICK_LINKS = [
  { to: '/weekly-review',              label: 'Weekly Review',      icon: ClipboardCheck, desc: 'Grade this week across pillars.' },
  { to: '/growth-audit',               label: 'Growth Audit',       icon: TrendingUp,     desc: 'Where can this project grow.' },
  { to: '/automations/inbox',          label: 'Automation Inbox',   icon: Inbox,          desc: 'Approve queued customer messages.' },
  { to: '/automations/recovery-reports',label: 'Recovery Reports',  icon: FileText,       desc: 'Draft and share client reports.' },
  { to: '/brand-kit',                  label: 'Brand Vault',        icon: Palette,        desc: 'Colors, logos, taglines.' },
];

export default function ProjectHome() {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { currentRole } = useRole();
  const { accessibleBars, selectedBar, setSelectedBar } = useApp();
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [websiteStats, setWebsiteStats] = useState<WebsiteStats | null>(null);

  // Only admins and owners can operate the setup wizard.
  const canRunWizard = isAdmin || currentRole === 'owner';

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('venues')
      .select('id,name,project_type,bar_code,slug,north_star,monetization_model,focus_status,ownership')
      .eq('id', venueId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setMeta((data as ProjectMeta) ?? null);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [venueId]);

  useEffect(() => {
    if (venueId !== STM_PROJECT_ID) {
      setWebsiteStats(null);
      return;
    }
    let cancelled = false;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      supabase.from('site_events').select('event_type').gte('created_at', since),
      supabase.from('inbound_leads').select('email,first_response_at,qualifier_data').is('captured_for_project_id', null).gte('created_at', since),
    ]).then(([eventsResult, leadsResult]) => {
      if (cancelled) return;
      if (eventsResult.error || leadsResult.error) {
        console.error('[project-home] website stats failed', eventsResult.error ?? leadsResult.error);
        return;
      }
      const events = eventsResult.data ?? [];
      const inquiries: Record<string, number> = {};
      let emailLeads = 0;
      let responded = 0;
      for (const lead of leadsResult.data ?? []) {
        const qualifier = (lead.qualifier_data ?? {}) as Record<string, unknown>;
        const vertical = typeof qualifier.source_vertical === 'string' && qualifier.source_vertical ? qualifier.source_vertical : 'other';
        inquiries[vertical] = (inquiries[vertical] ?? 0) + 1;
        if (lead.email) {
          emailLeads += 1;
          if (lead.first_response_at) responded += 1;
        }
      }
      setWebsiteStats({
        pageViews: events.filter((event) => event.event_type === 'page_view').length,
        ctaClicks: events.filter((event) => event.event_type === 'cta_click').length,
        callRequests: events.filter((event) => event.event_type === 'call_request').length,
        inquiries,
        firstResponseRate: emailLeads ? Math.round((responded / emailLeads) * 100) : null,
      });
    });
    return () => { cancelled = true; };
  }, [venueId]);

  // Opening a project page makes it the selected project everywhere else.
  useEffect(() => {
    if (!venueId || selectedBar?.id === venueId) return;
    const bar = accessibleBars.find((b) => b.id === venueId);
    if (bar) setSelectedBar(bar);
  }, [venueId, accessibleBars, selectedBar?.id]);

  const progress = useVenueOnboardingDetectors(venueId ?? null, meta?.project_type ?? null);
  const live = useVenueLiveStatus(progress.statusFor);

  // Non-client projects get the one-glance view; client projects are untouched.
  const isNonClient = !!meta && (meta.project_type ?? CLIENT_PROJECT_TYPE) !== CLIENT_PROJECT_TYPE;
  const { data: pillars = [] } = useEffectivePillars(
    isNonClient ? venueId : null,
    meta?.project_type ?? undefined,
  );
  const weekStart = useMemo(() => currentWeekRange().week_start, []);
  useEnsureCurrentWeek(venueId ?? null, isNonClient);
  const [setupOpen, setSetupOpen] = useState(false);

  // "Ultimate goal" inline edit (admins only)
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const setFocusStatus = async (next: 'active' | 'parked') => {
    if (!venueId) return;
    const { error } = await supabase
      .from('venues')
      .update({ focus_status: next } as any)
      .eq('id', venueId);
    if (error) {
      toast.error(error.message ?? 'Could not change the status');
      return;
    }
    setMeta((m) => (m ? { ...m, focus_status: next } : m));
    toast.success(next === 'active' ? 'Marked active' : 'Parked for now');
  };

  const setOwnership = async (next: string) => {
    if (!venueId) return;
    const { error } = await supabase
      .from('venues')
      .update({ ownership: next } as any)
      .eq('id', venueId);
    if (error) {
      toast.error(error.message ?? 'Could not change who owns this');
      return;
    }
    setMeta((m) => (m ? { ...m, ownership: next } : m));
    toast.success('Saved');
  };

  const saveGoal = async () => {
    if (!venueId) return;
    const next = goalDraft.trim() || null;
    const { error } = await supabase
      .from('venues')
      .update({ north_star: next } as any)
      .eq('id', venueId);
    if (error) {
      toast.error(error.message ?? 'Could not save the goal');
      return;
    }
    setMeta((m) => (m ? { ...m, north_star: next } : m));
    setGoalEditing(false);
    toast.success('Ultimate goal saved');
  };



  const resumeStepKey = useMemo(() => {
    const required = VENUE_ONBOARDING_STEPS.filter(
      (s) => s.required && (s.phase === 'identity' || s.phase === 'go_live'),
    );
    const nextRequired = required.find((s) => progress.statusFor(s.key) !== 'complete');
    if (nextRequired) return nextRequired.key;
    // otherwise first non-complete phase-3 step
    return VENUE_ONBOARDING_STEPS.find(
      (s) => s.phase === 'full_config' && progress.statusFor(s.key) === 'not_started',
    )?.key;
  }, [progress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="text-sm text-muted-foreground">
          This project may have been removed or you no longer have access.
        </p>
        <Button variant="outline" onClick={() => navigate('/portfolio')}>Back to Portfolio</Button>
      </div>
    );
  }

  const setupIncomplete = live.requiredDone < live.requiredTotal;
  const setupPct = live.requiredTotal === 0
    ? 100
    : Math.round((live.requiredDone / live.requiredTotal) * 100);

  const setupBlocks = (
    <>
      {/* Continue setup (only rendered for roles that can actually run the wizard) */}
      {canRunWizard && setupIncomplete && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Continue setup — {live.requiredDone} of {live.requiredTotal} required steps complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={setupPct} className="h-2" />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Finish the remaining go-live steps to activate this project's full toolkit.
              </p>
              <Button size="sm" onClick={() => setWizardOpen(true)}>
                Resume setup <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canRunWizard && (
        <ProjectCaptureLinkCard
          venueId={meta.id}
          venueSlug={meta.slug}
          projectType={meta.project_type}
        />
      )}

      {canRunWizard && <EmailDeliveryModeCard projectId={meta.id} />}

      {canRunWizard && (
        <ProposalsListCard
          companyId={null}
          venueId={meta.id}
          defaultProspectName={meta.name}
        />
      )}

      {/* Quick links to project-scoped surfaces */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.to} to={link.to} className="group">
              <Card className="h-full hover:border-primary transition-colors">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{link.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                  <div className="text-primary text-xs font-medium pt-1 group-hover:underline">
                    Open <ArrowRight className="h-3 w-3 inline" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );

  return (

    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">{meta.name}</h1>
            {meta.project_type && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {meta.project_type.replace(/_/g, ' ')}
              </Badge>
            )}
            {isNonClient && isAdmin && (
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={meta.focus_status === 'parked' ? 'parked' : 'active'}
                onValueChange={(value) => {
                  if (value === 'active' || value === 'parked') setFocusStatus(value);
                }}
                aria-label="Project focus"
              >
                <ToggleGroupItem value="active" className="h-7 px-2 text-xs">Active</ToggleGroupItem>
                <ToggleGroupItem value="parked" className="h-7 px-2 text-xs">Parked</ToggleGroupItem>
              </ToggleGroup>
            )}
            {isNonClient && isAdmin && (
              <Select
                value={meta.ownership ?? 'owned'}
                onValueChange={(v) => setOwnership(v)}
              >
                <SelectTrigger className="h-7 w-[120px] text-xs" aria-label="Ownership">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OWNERSHIP_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o} className="text-xs">
                      {OWNERSHIP_LABELS[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isNonClient && !isAdmin && meta.focus_status === 'parked' && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Parked</Badge>
            )}
          </div>
          {isNonClient && (
            <div className="pt-2 space-y-1">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground pt-0.5">
                  Ultimate goal
                </span>
                {goalEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 w-[260px] sm:w-[340px]"
                      autoFocus
                      value={goalDraft}
                      onChange={(e) => setGoalDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveGoal();
                        if (e.key === 'Escape') setGoalEditing(false);
                      }}
                      aria-label="Ultimate goal"
                      placeholder="What winning looks like for this project"
                    />
                    <Button size="sm" className="h-8" onClick={saveGoal}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setGoalEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => { setGoalDraft(meta.north_star ?? ''); setGoalEditing(true); }}
                    className="text-sm text-foreground text-left hover:underline disabled:hover:no-underline disabled:cursor-default"
                  >
                    {meta.north_star || (isAdmin ? 'Set the ultimate goal' : 'Not set yet')}
                  </button>
                )}
              </div>
              {meta.monetization_model && (
                <p className="text-xs text-muted-foreground">{meta.monetization_model}</p>
              )}
            </div>
          )}
          <div className="pt-2">
            <VenueLiveBadge
              isLive={live.isLive}
              phase3Pct={live.phase3Pct}
              requiredDone={live.requiredDone}
              requiredTotal={live.requiredTotal}
            />
          </div>
        </div>
        {canRunWizard && (
          <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
            <Settings className="h-4 w-4 mr-1" /> Setup wizard
          </Button>
        )}
      </div>

      {/* Next 10 — ranked, directly under the header (non-client projects only) */}
      {venueId === STM_PROJECT_ID && websiteStats && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Website, last 7 days</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Page views', websiteStats.pageViews],
                ['CTA clicks', websiteStats.ctaClicks],
                ['Call requests', websiteStats.callRequests],
                ['First-response rate', websiteStats.firstResponseRate == null ? '—' : `${websiteStats.firstResponseRate}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Inquiries by industry</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(websiteStats.inquiries).length ? Object.entries(websiteStats.inquiries).sort(([a], [b]) => a.localeCompare(b)).map(([vertical, count]) => (
                  <Badge key={vertical} variant="secondary">{vertical.replace(/-/g, ' ')}: {count}</Badge>
                )) : <span className="text-sm text-muted-foreground">—</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isNonClient && venueId && (
        <NextTenSection projectId={venueId} projectName={meta.name} />
      )}

      {/* One-glance project view (non-client projects only) */}
      {isNonClient && venueId && pillars.length > 0 && (
        <NonClientPillarsDashboard
          projectId={venueId}
          weekStart={weekStart}
          pillars={pillars}
          canEdit={canRunWizard}
        />
      )}

      {isNonClient ? (
        <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>Setup</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${setupOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-6">{setupBlocks}</CollapsibleContent>
        </Collapsible>
      ) : (
        setupBlocks
      )}


      {canRunWizard && wizardOpen && venueId && (
        <VenueOnboardingWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          venueId={venueId}
          defaultStepKey={resumeStepKey}
        />
      )}
    </div>
  );
}