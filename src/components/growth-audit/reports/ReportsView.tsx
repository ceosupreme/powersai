import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileBarChart, Plus, Printer, ArrowLeft, Sparkles } from 'lucide-react';
import { ReportBuilderDialog } from './ReportBuilderDialog';
import { ReportRenderer } from './ReportRenderer';
import { captureSnapshot } from './snapshot';
import type { ReportConfig, ReportSnapshot } from './types';
import { useApp } from '@/context/AppContext';
import { useGrowthScores } from '../useGrowthScores';
import { useFindings } from '../findings/useFindings';
import { useFoundationScores } from '@/components/foundation-audit/useFoundationScores';
import { useToast } from '@/hooks/use-toast';

export const ReportsView = () => {
  const { selectedBar } = useApp();
  const venueId = selectedBar?.id ?? null;
  const { toast } = useToast();
  const scores = useGrowthScores(venueId);
  const allFindings = useFindings(venueId);
  const foundation = useFoundationScores(venueId);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);

  const handleGenerate = (cfg: ReportConfig) => {
    if (!venueId) {
      toast({ title: 'Select a project first', description: 'Pick a project in the header before generating a report.', variant: 'destructive' });
      return;
    }
    setSnapshot(captureSnapshot(cfg, {
      primary: scores.primary,
      categories: scores.categories,
      priorities: scores.priorities,
      quickStats: scores.quickStats,
      findings: allFindings.data ?? [],
      foundation: foundation.result,
    }));
    setBuilderOpen(false);
  };

  if (snapshot) {
    return (
      <div className="space-y-4">
        <div className="report-no-print sticky top-0 z-10 -mx-6 px-6 py-3 bg-background/80 backdrop-blur border-b border-border/50 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSnapshot(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" />Back to Reports
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">Snapshot · {snapshot.id}</Badge>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" />Download as PDF
            </Button>
          </div>
        </div>
        <ReportRenderer snap={snapshot} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-card">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Reports</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Generate a stakeholder-ready report</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Capture a point-in-time snapshot of the Growth Audit — scores, findings, ops gate, and recommendations — formatted for owners, partners, or sales conversations.
            </p>
          </div>
          <Button size="lg" onClick={() => setBuilderOpen(true)} disabled={!venueId}>
            <Plus className="w-4 h-4 mr-1" />Generate Report
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Recent reports</h3>
        <Card className="p-6 border-dashed bg-card/30 text-center">
          <FileBarChart className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
          <div className="text-sm text-foreground">No saved reports yet</div>
          <div className="text-xs text-muted-foreground mt-1">
            Saved reports will appear here once archiving ships.
          </div>
        </Card>
        <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
          <FileBarChart className="w-3 h-3" />
          Saved report history will appear here once the first real report is generated and archived.
        </p>
      </div>

      <ReportBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onGenerate={handleGenerate}
        defaultVenueName={selectedBar?.bar_name ?? ''}
      />
    </div>
  );
};
