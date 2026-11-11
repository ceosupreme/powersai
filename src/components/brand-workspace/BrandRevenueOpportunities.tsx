import { useMemo, useState } from 'react';
import { ChevronDown, CircleDollarSign } from 'lucide-react';
import { useFoundationScores } from '@/components/foundation-audit/useFoundationScores';
import { laneScore } from '@/lib/effectiveFoundation';
import { RevenueLaneCard } from './RevenueLaneCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

const PRIORITY: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function BrandRevenueOpportunities({ projectId }: { projectId: string }) {
  const foundation = useFoundationScores(projectId);
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const lanes = useMemo(() => {
    const raw: any[] = (foundation.result?.categories ?? []).flatMap((g: any) => g.items ?? []);
    return raw.filter(x => String(x.item_key).startsWith('lane_')).sort((a,b) =>
      Number(a.status === 'satisfied') - Number(b.status === 'satisfied') ||
      (PRIORITY[a.severity] ?? 9) - (PRIORITY[b.severity] ?? 9) ||
      (laneScore(b) ?? 0) - (laneScore(a) ?? 0)
    );
  }, [foundation.result]);
  const running = lanes.filter(x => x.status === 'satisfied').length;
  const shown = all ? lanes : lanes.slice(0, 4);

  return <Card>
    <CardContent className="p-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full justify-between gap-3 text-left items-center">
          <span className="flex gap-2 items-start">
            <CircleDollarSign className="h-5 w-5 text-primary shrink-0"/>
            <span><strong className="block">Ways this brand can make money</strong>
              <span className="block text-xs text-muted-foreground">
                Review earning opportunities, build a setup plan, or record income that actually arrived.
              </span></span>
          </span>
          <ChevronDown className={'h-4 w-4 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')}/>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-3">
          {foundation.isLoading ? <p className="text-sm text-muted-foreground">Loading revenue opportunities…</p> :
          foundation.error ? <p role="alert" className="text-sm text-destructive">Revenue opportunities could not be loaded. Please try opening this section again.</p> :
          !foundation.result ? <p className="text-sm text-muted-foreground">Revenue opportunity data is not available yet.</p> :
          !lanes.length ? <p className="text-sm text-muted-foreground">No revenue opportunities are defined for this brand yet.</p> : <>
            <p className="text-xs text-muted-foreground">{running} of {lanes.length} opportunities reported running. Forecasts are not earnings.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {shown.map(lane => <RevenueLaneCard key={lane.item_key} item={lane} projectId={projectId} canEdit />)}
            </div>
            {lanes.length > 4 && <Button size="sm" variant="ghost" onClick={() => setAll(v => !v)}>
              {all ? 'Show top opportunities' : 'See all ' + lanes.length + ' opportunities'}
            </Button>}
          </>}
        </CollapsibleContent>
      </Collapsible>
    </CardContent>
  </Card>;
}
