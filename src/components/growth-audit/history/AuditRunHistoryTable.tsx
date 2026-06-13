import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowRight, ArrowUp, ChevronRight } from 'lucide-react';
import type { AuditRun } from './historyTypes';
import { AuditSnapshotDrawer } from './AuditSnapshotDrawer';

const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
});

export const AuditRunHistoryTable = ({ runs }: { runs: AuditRun[] }) => {
  const [selected, setSelected] = useState<AuditRun | null>(null);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Audit Run History</h3>
        <span className="text-xs text-muted-foreground">{runs.length} runs</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/50">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Triggered by</th>
              <th className="px-4 py-2 font-medium text-right">Score</th>
              <th className="px-4 py-2 font-medium text-right">Δ</th>
              <th className="px-4 py-2 font-medium">Key changes</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {runs.map((run, idx) => {
              const prev = runs[idx + 1];
              const delta = prev ? run.overallScore - prev.overallScore : 0;
              const Trend = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : ArrowRight;
              const trendColor = delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-destructive' : 'text-muted-foreground';
              return (
                <tr
                  key={run.id}
                  className="border-b border-border/30 hover:bg-muted/30 cursor-pointer"
                  onClick={() => setSelected(run)}
                >
                  <td className="px-4 py-3 text-foreground">{fmtShort(run.timestamp)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] capitalize">{run.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {run.triggeredByName ?? (run.type === 'scheduled' ? 'System' : '—')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{run.overallScore}</td>
                  <td className={`px-4 py-3 text-right ${trendColor}`}>
                    {prev ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Trend className="w-3 h-3" />{delta > 0 ? '+' : ''}{delta}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-md truncate">{run.keyChanges}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7" onClick={(e) => { e.stopPropagation(); setSelected(run); }}>
                      View<ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AuditSnapshotDrawer run={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </Card>
  );
};
