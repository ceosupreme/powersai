import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight, Settings, ClipboardCheck, TrendingUp, Inbox, FileText, Palette,
  Loader2, PlayCircle,
} from 'lucide-react';
import { VenueOnboardingWizard } from '@/components/onboarding/VenueOnboardingWizard';
import { VenueLiveBadge } from '@/components/onboarding/VenueLiveBadge';
import { useVenueOnboardingDetectors } from '@/hooks/useVenueOnboardingDetectors';
import { useVenueLiveStatus } from '@/hooks/useVenueLiveStatus';
import { VENUE_ONBOARDING_STEPS } from '@/config/venueOnboardingSteps';
import type { ProjectType } from '@/lib/effectivePillars';

interface ProjectMeta {
  id: string;
  name: string;
  project_type: ProjectType | null;
  bar_code: string | null;
}

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
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Only admins and owners can operate the setup wizard.
  const canRunWizard = isAdmin || currentRole === 'owner';

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('venues')
      .select('id,name,project_type,bar_code')
      .eq('id', venueId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setMeta((data as ProjectMeta) ?? null);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [venueId]);

  const progress = useVenueOnboardingDetectors(venueId ?? null, meta?.project_type ?? null);
  const live = useVenueLiveStatus(progress.statusFor);

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
          </div>
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