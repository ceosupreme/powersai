import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useNextTenAcrossProjects,
  useCompleteNextTenRow,
  type NextTenRow,
} from '@/hooks/useNextTen';
import { useUpsertProjectKpiValue } from '@/hooks/useProjectKpis';
import { currentWeekRange } from '@/hooks/useEnsureCurrentWeek';

const SOURCE_TONE: Record<string, string> = {
  Action: 'bg-primary/15 text-primary border-primary/40',
  Lane: 'bg-amber-500/15 text-amber-600 border-amber-500/40',
  Product: 'bg-blue-500/15 text-blue-600 border-blue-500/40',
  KPI: 'bg-muted text-muted-foreground border-border',
};

/** Next 10 ranked across every active own-brand project. */
export const AllProjectsNextTen = ({
  projects,
}: {
  projects: { id: string; name: string }[];
}) => {
  const { data: rows = [], isLoading } = useNextTenAcrossProjects(projects);
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
    if (num == null || Number.isNaN(num)) return toast.error('Enter a number');
    setBusy(row.key);
    try {
      await upsertKpi.mutateAsync({
        project_id: row.projectId,
        week_start: weekStart,
        pillar_key: row.pillarKey!,
        kpi_key: row.kpiKey!,
        actual: num,
        score: null,
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Next 10 across all projects
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading steps…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nothing outstanding right now — add an action, a KPI target or a money lane.
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
                        : `Mark done: ${row.step}`
                    }
                    onCheckedChange={() => onCheck(row)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{row.step}</p>
                    <p className="text-[11px] text-muted-foreground">{row.projectName}</p>
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
      </CardContent>
    </Card>
  );
};
