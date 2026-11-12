import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { BoardItem } from '@/hooks/useContentProduction';
import { FORMAT_LABELS, STAGE_LABELS } from './contentStages';
import { contentApprovalLabel, contentQualityHints, contentDeliveryGaps } from '@/lib/contentReadiness';

/**
 * A production card describes progress; it never changes the content stage on
 * its own. Opening the item leads to saved work, scheduling, and publication.
 */
export function ProductionItemCard({ item, brandName, onOpen }: {
  item: BoardItem;
  brandName: string;
  onOpen: (item: BoardItem) => void;
}) {
  const missing = item.stage === 'published' ? [] : contentQualityHints(item);
  const approvedForRelease = item.approved_at && contentDeliveryGaps(item).length === 0;
  return (
    <Card className="bg-card text-card-foreground border-border">
      <CardContent className="p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{brandName}</Badge>
          <Badge variant="secondary">
            {STAGE_LABELS[item.stage as keyof typeof STAGE_LABELS] ?? item.stage}
          </Badge>
          {item.purpose_type && <Badge variant="outline" className="capitalize">{item.purpose_type}</Badge>}
          {item.format && <Badge variant="outline">
            {(FORMAT_LABELS as any)[item.format] ?? item.format}
          </Badge>}
        </div>
        <h2 className="text-lg font-semibold leading-snug">{item.title}</h2>
        {item.due_date && <p className="text-xs text-muted-foreground">Due {item.due_date.slice(0, 10)}</p>}
        {item.family?.title && <p className="text-xs text-muted-foreground">{item.family.title}</p>}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant={approvedForRelease ? 'default' : 'outline'}>
            {contentApprovalLabel(item)}
          </Badge>
          <Badge variant="secondary">Concept quality {item.quality_score == null ? 'Not scored' : `${item.quality_score}/100`}</Badge>
        </div>
        {missing.length > 0 && <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">To finish this piece:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {missing.slice(0, 3).map((reason, i) => <li key={i}>{reason}</li>)}
          </ul>
          {missing.length > 3 && <p>{missing.length - 3} other items need attention</p>}
        </div>}
        {item.placements.length > 0 ? <div className="text-xs text-muted-foreground space-y-1">
          {item.placements.map(p => <p key={p.id}>
            {p.channel}{p.account_label ? ' · ' + p.account_label : ''}:
            {' '}{p.status === 'published' ? 'Live link recorded' :
              p.status === 'scheduled' ? 'Scheduled record' :
              p.status === 'draft' && p.scheduled_for ? 'Planning date saved (not scheduled)' : p.status}
          </p>)}
        </div> : <p className="text-xs text-muted-foreground">No publishing records yet.</p>}
        <Button type="button" variant="outline" className="w-full justify-between" onClick={() => onOpen(item)}>
          Open post, work and next action <ArrowRight className="h-4 w-4"/>
        </Button>
      </CardContent>
    </Card>
  );
}
