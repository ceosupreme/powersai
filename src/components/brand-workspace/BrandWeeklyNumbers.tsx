import { useState } from 'react';
import { ChevronDown, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useProjectKpis, useProjectKpiValues, useUpsertProjectKpiValue } from '@/hooks/useProjectKpis';
import { currentWeekRange } from '@/hooks/useEnsureCurrentWeek';
import { scoreKpi } from '@/lib/kpiScoring';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

const GROUP_NAMES: Record<string, string> = {
  audience: 'Audience growth', output: 'Content output', pipeline: 'Bookings and inquiries',
  revenue: 'Revenue', operations: 'Operations',
};

export function BrandWeeklyNumbers({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const defs = useProjectKpis(projectId);
  const week = currentWeekRange().week_start;
  const values = useProjectKpiValues(projectId, week);
  const save = useUpsertProjectKpiValue();
  const manual = (defs.data ?? []).filter(d => d.source === 'manual');
  const byGroup = [...new Set(manual.map(d => d.pillar_key))].sort();

  const begin = (key: string, actual: number | null) => {
    setEditing(key);
    setDraft(actual == null ? '' : String(actual));
    setNote('');
  };
  const submit = async (def: typeof manual[number]) => {
    const actual = Number(draft);
    if (!draft.trim() || !Number.isFinite(actual)) return toast.error('Enter a valid number.');
    if (def.direction === 'checklist' && actual !== 0 && actual !== 1) return toast.error('Enter 1 for complete or 0 for not completed.');
    if (actual < 0) return toast.error('Use 0 or a positive number for this score.');
    try {
      await save.mutateAsync({
        project_id: projectId, week_start: week, pillar_key: def.pillar_key,
        kpi_key: def.kpi_key, actual,
        // Checklist inputs are 0 or 1 here, but the shared scoring function
        // expects a percentage. Prevent "completed" from scoring as only 1%.
        score: def.target == null ? null : def.direction === 'checklist'
          ? scoreKpi(def.direction, actual === 1 ? 100 : 0, def.target)
          : scoreKpi(def.direction, actual, def.target),
        note: note.trim() ? 'Manual weekly entry: ' + note.trim() : 'Manual weekly entry',
      });
      toast.success('Weekly number saved.');
      setEditing(null); setDraft(''); setNote('');
    } catch (e: any) { toast.error(e?.message ?? 'Could not save your number.'); }
  };

  return <Card className="border-border">
    <CardContent className="p-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center justify-between gap-3 text-left w-full">
          <span className="flex items-start gap-2">
            <BarChart3 className="h-5 w-5 text-primary mt-0.5"/>
            <span><strong className="block">Update this week's business numbers</strong>
              <span className="block text-xs text-muted-foreground">Record actual audience, content and sales results. Week beginning {week}.</span></span>
          </span>
          <ChevronDown className={'h-4 w-4 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')}/>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          {defs.isLoading || values.isLoading ? <p className="text-sm text-muted-foreground">Loading your scorecard…</p> :
          defs.isError || values.isError ? <div className="space-y-2"><p role="alert" className="text-sm text-destructive">Could not load the weekly scorecard.</p>
            <Button size="sm" variant="outline" onClick={() => { defs.refetch(); values.refetch(); }}>Try again</Button></div> :
          !manual.length ? <p className="text-sm text-muted-foreground">This brand has no manual scorecard metrics configured yet.</p> :
          byGroup.map(group => <section key={group} className="space-y-2">
            <h3 className="font-semibold text-sm">{GROUP_NAMES[group] ?? group.replace(/_/g,' ')}</h3>
            <div className="divide-y rounded-lg border">
              {manual.filter(d => d.pillar_key === group).map(def => {
                const key = def.pillar_key + ':' + def.kpi_key;
                const recorded = (values.data ?? []).find(v => v.pillar_key === def.pillar_key && v.kpi_key === def.kpi_key);
                return <div className="p-3 space-y-2" key={key}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{def.kpi_label}</p>
                      <p className="text-xs text-muted-foreground">
                        {recorded?.actual == null ? 'Not entered for this week' : 'Recorded: ' + Number(recorded.actual).toLocaleString()}
                        {def.target == null ? '' : ' · Target ' + def.target.toLocaleString()}
                      </p>
                    </div>
                    {editing !== key && <Button size="sm" variant="outline" onClick={() => begin(key, recorded?.actual ?? null)}>
                      {recorded?.actual == null ? 'Enter' : 'Update'}
                    </Button>}
                  </div>
                  {editing === key && <div className="space-y-2">
                    <Input type="number" inputMode="decimal" step={def.direction === 'checklist' ? '1' : 'any'} value={draft} onChange={e => setDraft(e.target.value)}
                      aria-label={def.kpi_label} placeholder={def.direction === 'checklist' ? '0 or 1' : 'Actual number'}/>
                    <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Source or context (optional)"/>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={save.isPending || !draft.trim()} onClick={() => submit(def)}>Save actual number</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                  </div>}
                </div>;
              })}
            </div>
          </section>)}
        </CollapsibleContent>
      </Collapsible>
    </CardContent>
  </Card>;
}
