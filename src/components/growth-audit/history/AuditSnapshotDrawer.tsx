import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CATEGORY_LABEL } from '../findings/mockFindings';
import { getScoreBand, severityTone } from '../scoreBands';
import type { AuditRun } from './historyTypes';

const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', {
  month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

export const AuditSnapshotDrawer = ({
  run, open, onOpenChange,
}: {
  run: AuditRun | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  if (!run) return null;
  const band = getScoreBand(run.overallScore);
  const top5 = [...run.findings].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 5);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Audit Snapshot</SheetTitle>
          <div className="text-xs text-muted-foreground">
            {fmt(run.timestamp)} · <Badge variant="outline" className="text-[10px] capitalize">{run.type}</Badge>
            {' · '}<span>by {run.triggeredByName ?? (run.type === 'scheduled' ? 'System' : 'Unknown')}</span>
          </div>
          <div className="text-[11px] text-muted-foreground italic">
            Frozen at run time — reflects what was true then, not now.
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <Card className={`p-4 border ${band.border}`}>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Growth Score</div>
            <div className={`mt-1 text-4xl font-bold ${band.text}`}>{run.overallScore}</div>
            <div className="text-xs text-muted-foreground mt-1">{band.label}</div>
            <p className="text-xs text-foreground mt-3">{run.keyChanges}</p>
          </Card>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Category scores</h4>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(run.categoryScores) as (keyof typeof run.categoryScores)[]).map(k => {
                const s = run.categoryScores[k];
                const b = getScoreBand(s);
                return (
                  <div key={k} className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs">
                    <span className="text-muted-foreground truncate">{CATEGORY_LABEL[k]}</span>
                    <span className={`font-bold ${b.text}`}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Top 5 findings (snapshot)</h4>
            <div className="space-y-2">
              {top5.map((f, i) => (
                <Card key={f.id} className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-4 pt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground font-medium">{f.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{CATEGORY_LABEL[f.category]}</div>
                    </div>
                    <Badge variant="outline" className={severityTone(f.severity === 'Critical' ? 'High' : f.severity)}>
                      {f.severity}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
