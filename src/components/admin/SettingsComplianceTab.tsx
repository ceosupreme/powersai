import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, PlayCircle, Download, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type AuditRow = {
  venue_id: string;
  venue_name: string;
  no_clockout_te: number;
  no_clockout_insights: number;
  qualifying_ot_emp_weeks: number;
  ot_insights: number;
  late_meal_insights: number;
  missed_meal_insights: number;
  multi_location_insights: number;
  meal_tracking_gap_insights: number;
  long_shifts: number;
  long_shifts_no_break: number;
  missed_break_flags: number;
};

const cellTone = (te: number, ins: number) => {
  if (te === 0 && ins === 0) return 'text-muted-foreground';
  if (te > 0 && ins === 0) return 'text-destructive font-semibold';
  return 'text-foreground';
};

export const SettingsComplianceTab = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [windowDays, setWindowDays] = useState(30);
  const [sweeping, setSweeping] = useState<string | null>(null); // venue_id or 'all'
  const [meta, setMeta] = useState<{ since: string; today: string } | null>(null);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('compliance-audit', {
        body: {},
        method: 'GET' as any,
      });
      if (error) throw error;
      // The audit function reads from query params; invoke can't pass them directly,
      // so we hit it with a manual fetch instead.
      throw new Error('use-fetch');
    } catch {
      try {
        const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/compliance-audit?days=${windowDays}`;
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Audit failed');
        setRows(json.rows || []);
        setMeta({ since: json.since, today: json.today });
      } catch (e: any) {
        toast({ title: 'Audit failed', description: e.message, variant: 'destructive' });
      }
    }
    setLoading(false);
  };

  useEffect(() => { void loadAudit(); }, []); // eslint-disable-line

  const runSweep = async (venueId?: string, backfill?: boolean) => {
    setSweeping(venueId || 'all');
    try {
      const body: any = {};
      if (venueId) body.venue_id = venueId;
      if (backfill) body.backfill_30d = true;
      const { data, error } = await supabase.functions.invoke('compliance-sweep', { body });
      if (error) throw error;
      toast({
        title: 'Sweep complete',
        description: `Processed ${data?.venues_processed || 0} venues (window: ${data?.window_days || 7}d)`,
      });
      await loadAudit();
    } catch (e: any) {
      toast({ title: 'Sweep failed', description: e.message, variant: 'destructive' });
    }
    setSweeping(null);
  };

  const downloadCsv = () => {
    if (!rows.length) return;
    const headers = [
      'Venue', 'No-clockout TE', 'No-clockout insights',
      'Qualifying OT emp-weeks', 'OT insights',
      'Late meal insights', 'Missed meal insights', 'Multi-location insights',
      'Meal tracking gap', 'Long shifts (≥6h)', 'Long shifts w/o any break', 'Missed break flags',
    ];
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push([
        `"${r.venue_name.replace(/"/g, '""')}"`,
        r.no_clockout_te, r.no_clockout_insights,
        r.qualifying_ot_emp_weeks, r.ot_insights,
        r.late_meal_insights, r.missed_meal_insights, r.multi_location_insights,
        r.meal_tracking_gap_insights, r.long_shifts, r.long_shifts_no_break, r.missed_break_flags,
      ].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `compliance-audit-${meta?.today || 'today'}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Compliance Audit
            </CardTitle>
            <CardDescription>
              Per-venue gap analysis. Red cells = raw signals exist but no insight fired.
              Window: last {windowDays} days{meta ? ` (${meta.since} → ${meta.today})` : ''}.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadAudit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!rows.length}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button size="sm" onClick={() => runSweep(undefined, false)} disabled={!!sweeping}>
              {sweeping === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Run sweep (7d)
            </Button>
            <Button size="sm" variant="secondary" onClick={() => runSweep(undefined, true)} disabled={!!sweeping}>
              {sweeping === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Backfill 30d (all)
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading audit…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Venue</th>
                  <th className="py-2 px-2 text-right">No-clock TE</th>
                  <th className="py-2 px-2 text-right">No-clock ins.</th>
                  <th className="py-2 px-2 text-right">OT emp-wks ≥4h</th>
                  <th className="py-2 px-2 text-right">OT ins.</th>
                  <th className="py-2 px-2 text-right">Late meal</th>
                  <th className="py-2 px-2 text-right">Missed meal</th>
                  <th className="py-2 px-2 text-right">Multi-loc</th>
                  <th className="py-2 px-2 text-right">Meal gap</th>
                  <th className="py-2 px-2 text-right">Long shifts</th>
                  <th className="py-2 px-2 text-right">…no break</th>
                  <th className="py-2 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const hasGap =
                    (r.no_clockout_te > 0 && r.no_clockout_insights === 0) ||
                    (r.qualifying_ot_emp_weeks > 0 && r.ot_insights === 0);
                  return (
                    <tr key={r.venue_id} className="border-b border-border/30">
                      <td className="py-2 pr-3 font-medium">
                        <div className="flex items-center gap-2">
                          {hasGap && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          {r.venue_name}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{r.no_clockout_te}</td>
                      <td className={`py-2 px-2 text-right ${cellTone(r.no_clockout_te, r.no_clockout_insights)}`}>{r.no_clockout_insights}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{r.qualifying_ot_emp_weeks}</td>
                      <td className={`py-2 px-2 text-right ${cellTone(r.qualifying_ot_emp_weeks, r.ot_insights)}`}>{r.ot_insights}</td>
                      <td className="py-2 px-2 text-right">{r.late_meal_insights}</td>
                      <td className="py-2 px-2 text-right">{r.missed_meal_insights}</td>
                      <td className="py-2 px-2 text-right">{r.multi_location_insights}</td>
                      <td className="py-2 px-2 text-right">
                        {r.meal_tracking_gap_insights > 0 ? (
                          <Badge variant="outline" className="text-xs">⚠︎ {r.meal_tracking_gap_insights}</Badge>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{r.long_shifts}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{r.long_shifts_no_break}</td>
                      <td className="py-2 pl-2 text-right">
                        <Button
                          size="sm" variant="ghost"
                          disabled={!!sweeping}
                          onClick={() => runSweep(r.venue_id, false)}
                        >
                          {sweeping === r.venue_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sweep'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
