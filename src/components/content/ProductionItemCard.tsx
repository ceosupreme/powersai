import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { BoardItem } from '@/hooks/useContentProduction';
import { FORMAT_LABELS, STAGE_LABELS } from './contentStages';

/**
 * A production card describes progress; it never changes the content stage on
 * its own. Opening the item leads to saved work, scheduling, and publication.
 */
export function ProductionItemCard({ item, brandName, onOpen }: {
  item: BoardItem;
  brandName: string;
  onOpen: (item: BoardItem) => void;
}) {
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
          <Badge variant={item.approved_at ? 'default' : 'outline'}>
            {item.approved_at ? 'Approved' : 'Not approved'}
          </Badge>
          <Badge variant="secondary">Quality {item.quality_score ?? 'Not scored'}</Badge>
        </div>
        {(item.quality_fails ?? []).length > 0 && <p className="text-xs text-destructive">
          Fix before approval: {(item.quality_fails ?? []).join(', ')}
        </p>}
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
