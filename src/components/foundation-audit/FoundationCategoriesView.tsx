import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, MinusCircle, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useFoundationScores } from './useFoundationScores';
import { useUpsertFoundationItemStatus } from '@/hooks/useFoundationItemStatus';
import type { FoundationItemView, FoundationStatus } from './deriveFoundationScores';

const STATUS_TONE: Record<FoundationStatus, string> = {
  satisfied: 'text-emerald-600',
  partial: 'text-amber-600',
  missing: 'text-destructive',
  unknown: 'text-muted-foreground',
  not_applicable: 'text-muted-foreground',
};

function StatusIcon({ status }: { status: FoundationStatus }) {
  if (status === 'satisfied') return <CheckCircle2 className={`w-4 h-4 ${STATUS_TONE[status]}`} />;
  if (status === 'partial') return <AlertTriangle className={`w-4 h-4 ${STATUS_TONE[status]}`} />;
  if (status === 'missing') return <MinusCircle className={`w-4 h-4 ${STATUS_TONE[status]}`} />;
  return <Circle className={`w-4 h-4 ${STATUS_TONE[status]}`} />;
}

function ManualItemRow({ venueId, item }: { venueId: string; item: FoundationItemView }) {
  const upsert = useUpsertFoundationItemStatus();
  const [evidence, setEvidence] = useState(item.evidence_url ?? '');
  const checked = item.status === 'satisfied';

  const setStatus = (status: FoundationStatus) => {
    upsert.mutate({
      venue_id: venueId,
      item_key: item.item_key,
      status,
      evidence_url: evidence || null,
      notes: item.notes,
    });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/40">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => setStatus(v ? 'satisfied' : 'missing')}
        disabled={upsert.isPending}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{item.label}</span>
          <Badge variant="outline" className="text-[10px] uppercase">{item.severity}</Badge>
          {item.is_manual_only && (
            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">manual</Badge>
          )}
        </div>
        {item.description && (
          <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            onBlur={() => {
              if ((item.evidence_url ?? '') !== evidence) {
                upsert.mutate({
                  venue_id: venueId,
                  item_key: item.item_key,
                  status: item.status === 'unknown' ? 'missing' : item.status,
                  evidence_url: evidence || null,
                  notes: item.notes,
                });
              }
            }}
            placeholder="Evidence URL (optional)"
            className="h-8 text-xs"
          />
          {evidence && (
            <Button asChild size="sm" variant="ghost" className="h-8 px-2">
              <a href={evidence} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
            </Button>
          )}
        </div>
      </div>
      {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

function AutoItemRow({ item }: { item: FoundationItemView }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card/40">
      <StatusIcon status={item.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{item.label}</span>
          <Badge variant="outline" className="text-[10px] uppercase">{item.severity}</Badge>
          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
            {item.source === 'manual' ? 'manual override' : 'auto'}
          </Badge>
        </div>
        {item.description && (
          <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
        )}
        <div className="text-[11px] text-muted-foreground mt-1">
          {item.status === 'unknown'
            ? 'Awaiting first detection — run Refresh audit.'
            : `Detected ${item.detected_at ? new Date(item.detected_at).toLocaleDateString() : 'recently'} · signal: ${item.detection_signal}`}
          {item.status === 'missing' && item.recommended_fix && (
            <> · <span className="text-foreground">{item.recommended_fix}</span></>
          )}
        </div>
      </div>
    </div>
  );
}

export const FoundationCategoriesView = () => {
  const { selectedBar } = useApp();
  const venueId = selectedBar?.id ?? null;
  const { result, isLoading } = useFoundationScores(venueId);

  const categories = useMemo(() => result?.categories ?? [], [result]);

  if (!selectedBar) {
    return (
      <Card className="p-10 text-center bg-card/30 border-dashed">
        <p className="text-sm text-muted-foreground">Select a project to view foundation items.</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></Card>
    );
  }

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <Card key={cat.category_key} className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-foreground">{cat.label}</div>
              {cat.description && (
                <div className="text-xs text-muted-foreground">{cat.description}</div>
              )}
            </div>
            <Badge variant="outline" className="text-[10px]">
              {cat.score === null ? '—' : `${cat.score}`} · {cat.satisfied}/{cat.total}
            </Badge>
          </div>
          <div className="space-y-2">
            {cat.items.map((it) =>
              it.is_manual_only ? (
                <ManualItemRow key={it.item_key} venueId={venueId!} item={it} />
              ) : (
                <AutoItemRow key={it.item_key} item={it} />
              ),
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};