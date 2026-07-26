import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileSearch, MessageSquarePlus, ArrowUpRight, XCircle, Star } from 'lucide-react';
import { formatDollars } from '@/lib/leakStackFormat';
import type { Prospect } from '@/hooks/useProspects';

const STATUS_TONE: Record<string, string> = {
  new: 'bg-muted text-muted-foreground border-border',
  queued: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  checked: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  contacted: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  promoted: 'bg-primary/15 text-primary border-primary/30',
  dead: 'bg-destructive/10 text-destructive border-destructive/30',
};

interface Props {
  prospects: Prospect[];
  nicheLabels: Record<string, string>;
  onOpenCheckup: (p: Prospect) => void;
  onDraft: (p: Prospect) => void;
  onPromote: (p: Prospect) => void;
  onMarkDead: (p: Prospect) => void;
  busyId?: string | null;
}

export const ProspectDockList = ({
  prospects, nicheLabels, onOpenCheckup, onDraft, onPromote, onMarkDead, busyId,
}: Props) => {
  if (!prospects.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No prospects yet. Run the miner above.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {prospects.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base break-words">{p.business_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {(p.niche && nicheLabels[p.niche]) || p.niche || '—'} · {p.city || '—'}
                </p>
              </div>
              <Badge variant="outline" className={STATUS_TONE[p.status] ?? ''}>{p.status}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {p.rating ?? '—'} ({p.review_count ?? 0} reviews)
              </span>
              {p.phone && <span>{p.phone}</span>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Est. recoverable
                </p>
                <p className="text-base font-semibold tabular-nums">
                  {formatDollars(p.leak_total)}<span className="text-xs font-normal">/mo</span>
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Est. risk exposure
                </p>
                <p className="text-base font-semibold tabular-nums">
                  {formatDollars(p.risk_total)}<span className="text-xs font-normal">/mo</span>
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Estimates from public data and vertical defaults — not their books.
            </p>

            {p.last_error && (
              <p className="text-[11px] text-destructive break-words">Checkup error: {p.last_error}</p>
            )}

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onOpenCheckup(p)} disabled={!p.leak_run_id}>
                <FileSearch className="w-3.5 h-3.5 mr-1.5" /> Checkup
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDraft(p)} disabled={!p.leak_run_id}>
                <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" /> Draft
              </Button>
              <Button
                size="sm"
                onClick={() => onPromote(p)}
                disabled={p.status === 'promoted' || busyId === p.id}
              >
                <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" /> Promote
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => onMarkDead(p)}
                disabled={p.status === 'dead'}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Dead
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};