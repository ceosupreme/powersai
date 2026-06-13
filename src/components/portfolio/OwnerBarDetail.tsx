import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getGradeFromScore, getGradeColor, getGradeBackgroundClass } from '@/utils/scoring';
import { ScoreDisplay } from '@/components/shared/ScoreDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, Lightbulb, CheckCircle2, Clock } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface OwnerBarDetailProps {
  barId: string;
  barName: string;
  onBack: () => void;
}

const SIGNAL_LABELS: Record<string, string> = {
  r1: 'Net Sales vs Target', r2: 'Orders vs Target', r3: 'AOV vs Target', r4: 'Discount Rate',
  l1: 'Labor %', l2: 'SPLH', l3: 'Schedule Variance', l4: 'Overtime Rate', l5: 'Workforce Engagement',
  o1: 'Task Completion', o2: 'Turn Time', o3: 'Void Rate', o4: 'Unpaid Checks', o5: 'Sidework Completion',
  g1: 'Guest Count', g2: 'Tip %', g3: 'Refund Rate', g4: 'Online Reputation',
};

const PILLAR_LABELS = [
  { key: 'revenue_score', label: 'Revenue', prefix: 'r' },
  { key: 'labor_score', label: 'Labor', prefix: 'l' },
  { key: 'operations_score', label: 'Operations', prefix: 'o' },
  { key: 'guest_score', label: 'Guest', prefix: 'g' },
];

export function OwnerBarDetail({ barId, barName, onBack }: OwnerBarDetailProps) {
  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7).toISOString(), []);

  const { data: scorecard, isLoading: scLoading } = useQuery({
    queryKey: ['owner-scorecard', barId],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_scorecard')
        .select('*')
        .eq('bar_id', barId)
        .order('week_id', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: insights = [], isLoading: insLoading } = useQuery({
    queryKey: ['owner-insights', barId],
    queryFn: async () => {
      const { data } = await supabase
        .from('insight_cards')
        .select('id, title, pillar, severity, created_at, summary')
        .eq('bar_id', barId)
        .gte('created_at', sevenDaysAgo)
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: actions = [], isLoading: actLoading } = useQuery({
    queryKey: ['owner-actions', barId],
    queryFn: async () => {
      const { data } = await supabase
        .from('action_items')
        .select('id, title, status, priority, due_date')
        .eq('bar_id', barId)
        .neq('status', 'Done')
        .order('due_date', { ascending: true })
        .limit(15);
      return data || [];
    },
  });

  const isLoading = scLoading || insLoading || actLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      </div>
    );
  }

  const overallScore = scorecard?.overall_score ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">{barName}</h1>
      </div>

      {/* Weekly Scorecard */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Weekly Scorecard</h2>
        <div className="flex items-center gap-4 mb-6">
          <ScoreDisplay score={overallScore} size="lg" />
          {scorecard?.trend_4wk && (
            <span className="text-sm text-muted-foreground">4-wk: {scorecard.trend_4wk}</span>
          )}
        </div>

        {/* Pillar Scores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PILLAR_LABELS.map(p => {
            const score = (scorecard as any)?.[p.key] ?? 0;
            const grade = getGradeFromScore(score);
            return (
              <div key={p.key} className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">{p.label}</p>
                <ScoreDisplay score={score} size="sm" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Signal Breakdown */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Signal Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {Object.entries(SIGNAL_LABELS).map(([key, label]) => {
            const score = (scorecard as any)?.[`${key}_score`] ?? null;
            if (score === null) return null;
            const grade = getGradeFromScore(score);
            const color = getGradeColor(grade);
            return (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm text-foreground">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium" style={{ color }}>{Math.round(score)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getGradeBackgroundClass(grade)}`}>{grade}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Insights & Action Items side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Insights */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Recent Insights ({insights.length})
            </h2>
          </div>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">No insights in the last 7 days.</p>
          ) : (
            <div className="space-y-3">
              {insights.map(i => (
                <div key={i.id} className="flex items-start gap-2">
                  <span className="mt-0.5">{i.severity === 'High' || i.severity === 'Critical' ? '🔴' : i.severity === 'Medium' ? '🟠' : '🟢'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground">{i.pillar}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Actions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Pending Actions ({actions.length})
            </h2>
          </div>
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending action items.</p>
          ) : (
            <div className="space-y-3">
              {actions.map(a => (
                <div key={a.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.status} • {a.priority}</p>
                  </div>
                  {a.due_date && (
                    <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(a.due_date), 'MMM d')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key Drivers */}
      {scorecard?.key_drivers && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Key Drivers</h2>
          <p className="text-sm text-foreground/90 whitespace-pre-line">{scorecard.key_drivers}</p>
        </div>
      )}
    </div>
  );
}
