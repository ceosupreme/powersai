import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useProspects } from '@/hooks/useProspects';
import { StageBadge, SourceBadge } from '@/components/prospects/LeadBadges';
import { LeadContactIcons } from '@/components/prospects/LeadContactIcons';
import { TOP_LEAD_REASON, formatDay, todayPacific, topLeads, type TopLeadReason } from '@/lib/leads';

const REASON_TONE: Record<TopLeadReason, string> = {
  replied: 'bg-blue/15 text-blue border-blue/40',
  due: 'bg-destructive/10 text-destructive border-destructive/30',
  new: 'bg-signal-green/15 text-signal-green border-signal-green/40',
  contacted: 'bg-muted text-muted-foreground border-border',
  preview: 'bg-primary/10 text-primary border-primary/40',
  assigned: 'bg-muted text-muted-foreground border-border',
};

/**
 * The five leads most worth working today, straight from the Leads list. The picking rules
 * live in src/lib/leads.ts (topLeads) so this card and the Leads page never disagree.
 */
export function TopLeadsCard() {
  const { user, isAdmin } = useAuth();
  const { data: prospects = [], isLoading, isError, refetch } = useProspects();
  const today = todayPacific();
  const top = useMemo(
    () => topLeads(prospects, today, { me: user?.id ?? null, isAdmin, limit: 5 }),
    [prospects, today, user?.id, isAdmin],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl"><Target className="h-5 w-5 text-primary" />Leads to work today</CardTitle>
          <p className="text-sm text-muted-foreground">Unanswered inquiries, preview calls, callbacks, then assigned and open leads.</p>
        </div>
        <Button asChild variant="outline" className="h-10 shrink-0"><Link to="/prospects">All leads<ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">Loading leads…</p>
        ) : isError ? (
          <p role="alert" className="text-sm">Leads could not be loaded. <Button variant="link" className="h-auto p-0" onClick={() => void refetch()}>Try again</Button></p>
        ) : top.length === 0 ? (
          <p className="text-[15px] text-muted-foreground">
            {prospects.length ? 'Nothing needs you right now. Every open lead is either booked or waiting on a later follow-up date.' : 'No leads yet. New leads from the website, Facebook, Instagram and Google will show up here.'}
          </p>
        ) : (
          <ol className="divide-y">
            {top.map(({ lead: p, reason }) => (
              <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Link to={`/prospects?lead=${p.id}`} className="min-w-0 flex-1 space-y-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold break-words">{p.business_name}</span>
                    <Badge variant="outline" className={cn('text-xs', REASON_TONE[reason])}>{TOP_LEAD_REASON[reason]}</Badge>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <StageBadge status={p.status} />
                    <SourceBadge p={p} />
                    {p.contact_name && <span className="text-foreground">{p.contact_name}</span>}
                    {reason === 'due' && p.next_follow_up && <span>Due {formatDay(p.next_follow_up)}</span>}
                    {p.offer && <span>{p.offer}</span>}
                  </span>
                  {p.their_words && <span className="block text-sm text-muted-foreground line-clamp-2">{p.their_words}</span>}
                </Link>
                <LeadContactIcons p={p} />
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
