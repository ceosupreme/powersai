import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  STM_PROJECT_ID, summarizeWebsiteWeek, websiteInquiryRows, websiteOrdersLine, websiteWeekParts,
  type WebsiteLeadRow, type WebsiteWeek as Week,
} from '@/lib/websiteWeek';
import { SectionHeading } from './BrandDashboard';

const DAY = 86_400_000;

function useWebsiteWeek(enabled: boolean) {
  return useQuery({
    queryKey: ['brand-workspace', 'website-week'],
    enabled,
    queryFn: async (): Promise<Week> => {
      const since = new Date(Date.now() - 7 * DAY).toISOString();
      const ordersSince = new Date(Date.now() - 30 * DAY).toISOString();
      // Head counts, so a busy week is never cut off at the 1,000-row read limit.
      const events = (type: string) => supabase.from('site_events').select('id', { count: 'exact', head: true })
        .eq('is_internal', false).eq('event_type', type).gte('created_at', since);
      const [views, clicks, calls, leads, orders] = await Promise.all([
        events('page_view'),
        events('cta_click'),
        events('call_request'),
        supabase.from('inbound_leads').select('email,first_response_at,qualifier_data').is('captured_for_project_id', null).gte('created_at', since),
        supabase.from('site_orders').select('amount_cents').in('status', ['paid', 'active']).gte('created_at', ordersSince),
      ]);
      const error = views.error ?? clicks.error ?? calls.error ?? leads.error ?? orders.error;
      if (error) throw error;
      return summarizeWebsiteWeek(
        { pageViews: views.count ?? 0, ctaClicks: clicks.count ?? 0, callRequests: calls.count ?? 0 },
        (leads.data ?? []) as WebsiteLeadRow[],
        orders.data ?? [],
      );
    },
  });
}

/** One quiet summary line; the industry breakdown opens on tap. */
export function WebsiteWeekView({ week }: { week: Week }) {
  const [open, setOpen] = useState(false);
  const rows = websiteInquiryRows(week);
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 space-y-1">
      <p className="text-sm text-foreground leading-relaxed">
        {/* Each number stays whole; the line wraps only at the separators on a phone. */}
        {websiteWeekParts(week).map((part, i) => (
          <Fragment key={i}>
            {i > 0 && <span aria-hidden className="text-muted-foreground"> · </span>}
            <span className="whitespace-nowrap">{part}</span>
          </Fragment>
        ))}
      </p>
      <p className="text-sm text-muted-foreground">{websiteOrdersLine(week)}</p>
      {rows.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="-ml-2 min-h-11 text-muted-foreground">
              Inquiries by industry <ChevronDown className={cn('ml-1 h-4 w-4 transition-transform', open && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-wrap gap-2 pb-1">
            {rows.map((r) => <Badge key={r.label} variant="secondary">{r.label}: {r.count}</Badge>)}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

/** Supreme Team Media only; every other brand renders nothing. */
export function WebsiteWeekSection({ projectId }: { projectId: string }) {
  const isStm = projectId === STM_PROJECT_ID;
  const week = useWebsiteWeek(isStm);
  if (!isStm) return null;
  return (
    <section className="space-y-3">
      <SectionHeading icon={Globe} title="Website, last 7 days" tone="text-muted-foreground" />
      {week.isLoading ? <p className="text-sm text-muted-foreground">Loading website numbers…</p>
        : week.isError ? (
          <p role="status" className="text-sm text-muted-foreground">
            Website numbers could not be loaded. <button type="button" className="underline" onClick={() => week.refetch()}>Try again</button>
          </p>
        ) : week.data ? <WebsiteWeekView week={week.data} /> : null}
    </section>
  );
}
