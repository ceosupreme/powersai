import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { ActionPlanModule } from '@/components/weekly-review/ActionPlanModule';
import { useActionItems } from '@/hooks/useActionItems';
import { useInsightApproval } from '@/hooks/useInsightApproval';
import { useContentItems } from '@/hooks/useContentItems';
import { useChannelRevenue, formatUSD } from '@/hooks/useChannelRevenue';
import { useProjectPillarScoreTrend } from '@/hooks/useProjectPillarScoreTrend';
import { EffectivePillar } from '@/lib/effectivePillars';
import { sortByPriority } from '@/lib/utils';

const SectionShell = ({
  title,
  to,
  linkLabel = 'View all',
  children,
}: {
  title: string;
  to?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
      <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
        {title}
      </CardTitle>
      {to && (
        <Link to={to} className="text-xs text-primary hover:underline whitespace-nowrap">
          {linkLabel} <ArrowRight className="h-3 w-3 inline" />
        </Link>
      )}
    </CardHeader>
    <CardContent className="pt-1">{children}</CardContent>
  </Card>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-muted-foreground">{children}</p>
);

/* ── Action plan ─────────────────────────────────────────────────── */

const ActionPlanSection = ({ projectId }: { projectId: string }) => {
  const { data: cards = [] } = useActionItems(projectId);
  const { handleApprove, handleReject, processingIds } = useInsightApproval();
  const open = useMemo(
    () => sortByPriority(cards.filter((c) => c.approval_status !== 'Rejected')),
    [cards],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-wide text-muted-foreground">Action plan</h3>
        <Link to="/weekly-review" className="text-xs text-primary hover:underline">
          View all <ArrowRight className="h-3 w-3 inline" />
        </Link>
      </div>
      <ActionPlanModule
        actions={open}
        onApprove={handleApprove}
        onReject={handleReject}
        processingIds={processingIds}
      />
    </div>
  );
};

/* ── Insights ────────────────────────────────────────────────────── */

const InsightsSection = ({ projectId }: { projectId: string }) => {
  const { data = [] } = useQuery({
    queryKey: ['project-open-insights', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('insights')
        .select('id,title,summary,severity,pillar,status,created_at')
        .eq('venue_id', projectId)
        // nullable status: NOT IN would drop NULL rows
        .or('status.is.null,and(status.neq.Dismissed,status.neq.Actioned)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <SectionShell title="Insights" to="/insights">
      {data.length === 0 ? (
        <Empty>No open insights for this project.</Empty>
      ) : (
        <ul className="space-y-2">
          {data.map((i: any) => (
            <li key={i.id} className="border-t border-border pt-2 first:border-0 first:pt-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground">{i.title}</p>
                <div className="flex gap-1 shrink-0">
                  {i.severity && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {i.severity}
                    </Badge>
                  )}
                  {i.pillar && (
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {i.pillar}
                    </Badge>
                  )}
                </div>
              </div>
              {i.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2">{i.summary}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
};

/* ── Products by stage ───────────────────────────────────────────── */

const ProductsSection = ({ projectId }: { projectId: string }) => {
  const { data = [] } = useQuery({
    queryKey: ['project-products', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: links } = await supabase
        .from('channel_product_channels')
        .select('product_id')
        .eq('project_id', projectId);
      const ids = (links ?? []).map((l: any) => l.product_id).filter(Boolean);
      if (ids.length === 0) return [];
      const { data: products } = await supabase
        .from('channel_products')
        .select('id,name,status')
        .in('id', ids);
      return products ?? [];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of data as any[]) {
      const key = p.status || 'unset';
      map.set(key, [...(map.get(key) ?? []), p.name]);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <SectionShell title="Products by stage" to={`/products?project=${projectId}`}>
      {grouped.length === 0 ? (
        <Empty>No products linked to this project yet.</Empty>
      ) : (
        <ul className="space-y-2">
          {grouped.map(([status, names]) => (
            <li key={status} className="text-sm">
              <span className="capitalize text-foreground">{status}</span>{' '}
              <span className="text-muted-foreground">({names.length})</span>
              <p className="text-xs text-muted-foreground truncate">{names.join(', ')}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
};

/* ── Content pipeline ────────────────────────────────────────────── */

const ContentSection = ({ projectId }: { projectId: string }) => {
  const { data: items = [] } = useContentItems(projectId);
  const byStage = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items as any[]) {
      const key = it.stage || 'unset';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <SectionShell title="Content pipeline" to="/content">
      {byStage.length === 0 ? (
        <Empty>No content items for this project yet.</Empty>
      ) : (
        <div className="flex flex-wrap gap-2">
          {byStage.map(([stage, count]) => (
            <Badge key={stage} variant="outline" className="capitalize">
              {stage} · {count}
            </Badge>
          ))}
        </div>
      )}
    </SectionShell>
  );
};

/* ── Revenue this month ──────────────────────────────────────────── */

const RevenueSection = ({ projectId }: { projectId: string }) => {
  const { data: rows = [] } = useChannelRevenue(projectId);
  const periodMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);

  const { total, byType } = useMemo(() => {
    const month = (rows as any[]).filter((r) => r.period_month === periodMonth);
    const map = new Map<string, number>();
    let sum = 0;
    for (const r of month) {
      const amt = Number(r.amount ?? 0);
      sum += amt;
      map.set(r.revenue_type || 'other', (map.get(r.revenue_type || 'other') ?? 0) + amt);
    }
    return { total: sum, byType: [...map.entries()] };
  }, [rows, periodMonth]);

  return (
    <SectionShell title="Revenue this month" to="/revenue">
      {byType.length === 0 ? (
        <Empty>No revenue recorded for this month.</Empty>
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-bold font-mono text-foreground">{formatUSD(total)}</p>
          <div className="flex flex-wrap gap-2">
            {byType.map(([type, amt]) => (
              <Badge key={type} variant="outline" className="capitalize">
                {type} · {formatUSD(amt)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </SectionShell>
  );
};

/* ── Score trend ─────────────────────────────────────────────────── */

const ScoreTrendSection = ({
  projectId,
  pillars,
}: {
  projectId: string;
  pillars: EffectivePillar[];
}) => {
  const { data: trend = [] } = useProjectPillarScoreTrend(projectId, pillars);
  const max = 100;

  return (
    <SectionShell title="Score trend (12 weeks)">
      {trend.every((t) => t.score == null) ? (
        <Empty>No weekly scores recorded yet.</Empty>
      ) : (
        <div className="flex items-end gap-1 h-24">
          {trend.map((t) => (
            <div key={t.week_start} className="flex-1 flex flex-col justify-end items-center gap-1">
              <div
                className="w-full rounded-t bg-primary/70"
                style={{ height: t.score == null ? 2 : `${(t.score / max) * 100}%` }}
                title={`${t.week_start}: ${t.score == null ? '—' : Math.round(t.score)}`}
              />
              <span className="text-[9px] text-muted-foreground">
                {t.week_start.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
};

/* ── Composite ───────────────────────────────────────────────────── */

export const ProjectOneGlance = ({
  projectId,
  pillars,
}: {
  projectId: string;
  pillars: EffectivePillar[];
}) => (
  <div className="space-y-4">
    <ActionPlanSection projectId={projectId} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <InsightsSection projectId={projectId} />
      <ProductsSection projectId={projectId} />
      <ContentSection projectId={projectId} />
      <RevenueSection projectId={projectId} />
    </div>
    <ScoreTrendSection projectId={projectId} pillars={pillars} />
  </div>
);
