// Workspace widget — surfaces top "context_marketing_opportunity" findings
// (upcoming dates/weather/events with no marketing coverage) for the
// selected venue.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, CloudSun, Newspaper, Trophy, Ticket, Sparkles } from 'lucide-react';
import { useFindings } from '@/components/growth-audit/findings/useFindings';
import { cn } from '@/lib/utils';

const SOURCE_ICON: Record<string, typeof Calendar> = {
  calendar: Calendar,
  weather: CloudSun,
  news: Newspaper,
  sports: Trophy,
  events: Ticket,
};

const sevTone = (s: string) =>
  s === 'Critical' || s === 'High' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : s === 'Medium' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
  : 'bg-muted text-muted-foreground border-border';

export const UpcomingOpportunitiesWidget = ({ venueId }: { venueId: string | null }) => {
  const { data: findings = [], isLoading } = useFindings(venueId);

  const items = useMemo(() => {
    return findings
      .filter((f) =>
        (f as any).typeId === 'context_marketing_opportunity'
        && f.status !== 'Resolved' && f.status !== 'Dismissed',
      )
      .sort((a, b) => {
        const da = (a as any).metadata?.event_date ?? '9999';
        const db = (b as any).metadata?.event_date ?? '9999';
        return String(da).localeCompare(String(db));
      })
      .slice(0, 6);
  }, [findings]);

  if (!venueId) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/15 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Upcoming opportunities</h2>
          <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
        </div>
        <Link
          to="/growth-audit?subtab=findings"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground italic">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">
          No uncovered upcoming context — keep current campaigns running.
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((f) => {
            const meta = (f as any).metadata ?? {};
            const Icon = SOURCE_ICON[meta.source_type] ?? Calendar;
            return (
              <Link
                key={f.id}
                to={`/growth-audit?subtab=findings&finding=${f.id}`}
                className="flex items-start gap-2 p-2 rounded-md border border-transparent hover:bg-muted/40 hover:border-border transition"
              >
                <Badge variant="outline" className={cn('text-[10px] mt-0.5 shrink-0', sevTone(f.severity))}>
                  {f.severity}
                </Badge>
                <Icon className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{f.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {meta.event_date}{meta.days_out != null ? ` · in ${meta.days_out}d` : ''}
                    {meta.programming_matched ? ' · matches programming' : ''}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
};
