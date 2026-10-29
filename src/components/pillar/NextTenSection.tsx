import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNextTen, useCompleteNextTenRow, NextTenRow, nextTenEmptyMessage } from '@/hooks/useNextTen';
import { useProjectKpis, useUpsertProjectKpiValue } from '@/hooks/useProjectKpis';
import { currentWeekRange } from '@/hooks/useEnsureCurrentWeek';
import { scoreKpi } from '@/lib/kpiScoring';

const SOURCE_TONE: Record<string, string> = {
  Action: 'bg-primary/15 text-primary border-primary/40',
  Lane: 'bg-amber-500/15 text-amber-600 border-amber-500/40',
  Product: 'bg-blue-500/15 text-blue-600 border-blue-500/40',
  KPI: 'bg-muted text-muted-foreground border-border',
};

/** Ranked "do these next" list for a non-client project. */
export const NextTenSection = ({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) => {
  const { data, isLoading, isError, error, refetch } = useNextTen(projectId, projectName);
  const rows = data?.rows ?? [];
  const unavailable = data?.unavailable ?? [];
  const { data: kpiDefs = [] } = useProjectKpis(projectId);
  const complete = useCompleteNextTenRow();
  const upsertKpi = useUpsertProjectKpiValue();
  const weekStart = useMemo(() => currentWeekRange().week_start, []);

  const [kpiOpen, setKpiOpen] = useState<string | null>(null);
  const [kpiValue, setKpiValue] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const onCheck = async (row: NextTenRow) => {
    if (row.source === 'KPI') {
      setKpiOpen((k) => (k === row.key ? null : row.key));
      setKpiValue('');
      return;
    }
    setBusy(row.key);
    try {
      await complete.mutateAsync(row);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save that step');
    } finally {
      setBusy(null);
    }
  };

  const saveKpi = async (row: NextTenRow) => {
    const num = kpiValue.trim() === '' ? null : Number(kpiValue);
    if (num == null || !Number.isFinite(num)) return toast.error('Enter a finite number');
    const def = kpiDefs.find(
      (d) => d.pillar_key === row.pillarKey && d.kpi_key === row.kpiKey,
    );
    setBusy(row.key);
    try {
      await upsertKpi.mutateAsync({
        project_id: projectId,
        week_start: weekStart,
        pillar_key: row.pillarKey!,
        kpi_key: row.kpiKey!,
        actual: num,
        score: def ? scoreKpi(def.direction, num, def.target) : null,
      });
      setKpiOpen(null);
      setKpiValue('');
      toast.success('Saved');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save that number');
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const left = 56;
    let y = 72;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(projectName || 'Project', left, y);
    y += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(110);
    doc.text(
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      left,
      y,
    );
    y += 30;

    doc.setTextColor(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Next 10', left, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const maxWidth = 440;
    if (unavailable.length) {
      const warning = doc.splitTextToSize(`Incomplete list: could not check ${unavailable.join(', ')}.`, maxWidth);
      doc.text(warning, left, y);
      y += warning.length * 16 + 16;
    }
    rows.forEach((r) => {
      doc.rect(left, y - 10, 12, 12);
      const lines = doc.splitTextToSize(`${r.step}${r.note ? `  (${r.note})` : ''}  [${r.source}]`, maxWidth);
      doc.text(lines, left + 24, y);
      y += Math.max(24, lines.length * 16 + 10);
    });

    if (rows.length === 0) {
      doc.setTextColor(110);
      doc.text(doc.splitTextToSize(nextTenEmptyMessage(data), maxWidth), left, y);
    }

    doc.save(
      `next-10-${(projectName || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Next 10
        </CardTitle>
        <Button variant="outline" size="sm" onClick={downloadPdf} disabled={isLoading || isError}>
          <Download className="h-4 w-4 mr-1" /> Download PDF
        </Button>
      </CardHeader>
      <CardContent className="pt-1">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading steps…</p>
        ) : isError ? (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p>Could not check this project, so this list is not trustworthy right now.</p>
              <p className="text-xs text-muted-foreground mt-1">{(error as any)?.message}</p>
              <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <>
          {unavailable.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-600 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Could not check {unavailable.join(', ')}. Items from those sources may be missing below.{' '}
                <button className="underline" onClick={() => void refetch()}>Try again</button>
              </span>
            </div>
          )}
          {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {nextTenEmptyMessage(data)}
          </p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li key={row.key} className="py-2 border-t border-border first:border-0 first:pt-0">
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="mt-0.5"
                    checked={false}
                    disabled={busy === row.key}
                    aria-label={
                      row.source === 'KPI'
                        ? `Enter this week's number for ${row.step}`
                        : row.source === 'Lane'
                          ? `Mark on: ${row.step}`
                          : `Mark done: ${row.step}`
                    }
                    onCheckedChange={() => onCheck(row)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{row.step}</p>
                    {row.note && (
                      <p className="text-[11px] text-muted-foreground">{row.note}</p>
                    )}
                    {kpiOpen === row.key && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          step="any"
                          className="h-8 w-32"
                          autoFocus
                          value={kpiValue}
                          onChange={(e) => setKpiValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveKpi(row);
                            if (e.key === 'Escape') setKpiOpen(null);
                          }}
                          aria-label="This week's actual"
                        />
                        <Button size="sm" className="h-8" disabled={busy === row.key} onClick={() => saveKpi(row)}>
                          {busy === row.key ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setKpiOpen(null)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${SOURCE_TONE[row.source] ?? ''}`}>
                    {row.source}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
