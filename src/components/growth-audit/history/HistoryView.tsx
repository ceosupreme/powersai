import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History as HistoryIcon, Inbox } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuditHistory, useScoreSnapshots, type ScoreRange } from './useAuditHistory';
import { AuditRunHistoryTable } from './AuditRunHistoryTable';
import { ScoreTrendsChart } from './ScoreTrendsChart';
import { FindingsResolutionChart } from './FindingsResolutionChart';
import { CampaignActivityChart } from './CampaignActivityChart';

export const HistoryView = () => {
  const { selectedBar } = useApp();
  const venueId = selectedBar?.id ?? null;
  const { runs, findingsFlow, campaignActivity, isLoading } = useAuditHistory(venueId);
  const [range, setRange] = useState<ScoreRange>('6M');
  const snapshotsQ = useScoreSnapshots(venueId, range);
  const snapshots = useMemo(() => snapshotsQ.data ?? [], [snapshotsQ.data]);

  if (!selectedBar) {
    return (
      <Card className="p-10 text-center bg-card/30 border-dashed">
        <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <h2 className="text-lg font-semibold text-foreground">Select a venue</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose a venue to view its audit history.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-card">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600">
            <HistoryIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Audit History</h2>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {runs.length} run{runs.length === 1 ? '' : 's'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Every audit run is recorded as a point-in-time snapshot. Click any row to see the
              metrics and findings as they were when that run completed.
            </p>
          </div>
        </div>
      </Card>

      {isLoading && runs.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading history…</Card>
      ) : runs.length === 0 ? (
        <Card className="p-10 text-center bg-card/30 border-dashed">
          <div className="text-sm font-medium text-foreground">No audit runs yet</div>
          <p className="text-xs text-muted-foreground mt-1">
            Trigger "Run Full Audit" from the Overview tab to record this venue's first snapshot.
          </p>
        </Card>
      ) : (
        <>
          <AuditRunHistoryTable runs={runs} />
          <ScoreTrendsChart
            snapshots={snapshots}
            range={range}
            onRangeChange={setRange}
            isLoading={snapshotsQ.isLoading}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FindingsResolutionChart data={findingsFlow} />
            <CampaignActivityChart data={campaignActivity} />
          </div>
        </>
      )}
    </div>
  );
};
