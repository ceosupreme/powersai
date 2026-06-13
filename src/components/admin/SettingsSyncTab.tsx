import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, Calendar as CalendarIcon, Brain, BarChart3, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { EmployeeMatchingReviewCard } from './EmployeeMatchingReviewCard';

interface SyncRun {
  id: string;
  bar_id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  records_processed: number | null;
  records_created: number | null;
  records_updated: number | null;
  error_message: string | null;
}

interface SyncTypeInfo {
  key: string;
  label: string;
  edgeFunction: string;
  body?: Record<string, any>;
}

const SYNC_TYPES: SyncTypeInfo[] = [
  { key: 'toast', label: 'Toast Data', edgeFunction: 'sync-toast-metrics' },
  { key: 'seven_shifts_roster', label: '7shifts Roster', edgeFunction: 'sync-seven-shifts' },
  { key: 'toast_employees', label: 'Toast Employees', edgeFunction: 'sync-toast-employees' },
  { key: 'toast_time_entries', label: 'Toast Time Entries', edgeFunction: 'sync-toast-time-entries' },
  { key: 'asana_gm', label: 'Asana GM Logs', edgeFunction: 'sync-asana-logs', body: { log_type: 'gm' } },
  { key: 'asana_lead', label: 'Asana Lead Logs', edgeFunction: 'sync-asana-logs', body: { log_type: 'lead' } },
  { key: 'ai_parse', label: 'AI Parse', edgeFunction: 'parse-logs' },
  { key: 'ai_insights', label: 'Daily Insights (Ops)', edgeFunction: 'generate-daily-insights', body: { mode: 'daily' } },
  { key: 'google_ratings', label: 'Online Ratings', edgeFunction: 'sync-google-ratings' },
  { key: 'weekly_scores', label: 'Weekly Scores', edgeFunction: 'compute-weekly-scores' },
  { key: 'monday_briefing', label: 'Monday Briefing', edgeFunction: 'generate-monday-briefing' },
];

export const SettingsSyncTab = () => {
  const [latestByType, setLatestByType] = useState<Record<string, SyncRun>>({});
  const [recentRuns, setRecentRuns] = useState<SyncRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  // Backfill state
  const [backfillStart, setBackfillStart] = useState<Date>(subDays(new Date(), 7));
  const [backfillEnd, setBackfillEnd] = useState<Date>(subDays(new Date(), 1));
  const [backfillRunning, setBackfillRunning] = useState(false);

  // Weekly insights state
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [weeklyVenueId, setWeeklyVenueId] = useState<string>('all');
  const [weeklyDate, setWeeklyDate] = useState<Date>(startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }));
  const [weeklyRunning, setWeeklyRunning] = useState(false);

  // Bulk recompute state
  const [recomputeVenueId, setRecomputeVenueId] = useState<string>('');
  const [recomputeWeeks, setRecomputeWeeks] = useState<string>('16');
  const [recomputeRunning, setRecomputeRunning] = useState(false);
  const [recomputeProgress, setRecomputeProgress] = useState<{ done: number; total: number } | null>(null);

  // Weekly scores state
  const [scoresWeekDate, setScoresWeekDate] = useState<Date>(startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }));

  // Red-score alerts backfill state
  const [redAlertsWeeks, setRedAlertsWeeks] = useState<string>('8');
  const [redAlertsRunning, setRedAlertsRunning] = useState(false);
  const [redAlertsProgress, setRedAlertsProgress] = useState<{ done: number; total: number } | null>(null);

  // Inventory insights backfill state
  const [inventoryRunning, setInventoryRunning] = useState(false);
  const [inventoryProgress, setInventoryProgress] = useState<{ done: number; total: number } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sync_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const runs = (data || []) as SyncRun[];
      setRecentRuns(runs.slice(0, 20));
      const byType: Record<string, SyncRun> = {};
      runs.forEach(r => { if (!byType[r.sync_type]) byType[r.sync_type] = r; });
      setLatestByType(byType);
    } catch { toast.error('Failed to load sync data'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
    // Fetch venues for weekly trigger
    supabase.from('venues').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setVenues(data); });
  }, []);

  const triggerSync = async (st: SyncTypeInfo) => {
    setTriggering(st.key);
    try {
      let body = st.body || {};
      // For weekly_scores, include the selected week_start
      if (st.key === 'weekly_scores') {
        const ws = format(scoresWeekDate, 'yyyy-MM-dd');
        const we = format(endOfWeek(scoresWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        body = { ...body, week_start: ws };
        toast.info(`Computing scores for week ${ws} to ${we}...`);
      }
      const { error } = await supabase.functions.invoke(st.edgeFunction, { body });
      if (error) throw error;
      toast.success(`${st.label} sync triggered`);
      setTimeout(fetchData, 3000);
    } catch (e: any) { toast.error(`Failed to trigger ${st.label}`); console.error(e); }
    finally { setTriggering(null); }
  };

  const triggerBackfill = async () => {
    setBackfillRunning(true);
    const startDate = format(backfillStart, 'yyyy-MM-dd');
    const endDate = format(backfillEnd, 'yyyy-MM-dd');
    toast.info(`Backfilling insights from ${startDate} to ${endDate}... This may take several minutes.`);
    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-insights', {
        body: { mode: 'daily', start_date: startDate, end_date: endDate },
      });
      if (error) throw error;
      toast.success(`Backfill complete: ${data?.total_insights || 0} insights, ${data?.total_actions || 0} actions across ${data?.dates_processed || 0} days`);
      setTimeout(fetchData, 2000);
    } catch (e: any) {
      toast.error('Backfill failed — check logs');
      console.error(e);
    } finally {
      setBackfillRunning(false);
    }
  };

  const triggerWeeklyInsights = async () => {
    setWeeklyRunning(true);
    const weekStart = format(weeklyDate, 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(weeklyDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const venueName = weeklyVenueId === 'all' ? 'all venues' : venues.find(v => v.id === weeklyVenueId)?.name || 'venue';
    toast.info(`Generating weekly insights for ${venueName} (${weekStart} to ${weekEnd})...`);
    try {
      const body: Record<string, any> = { mode: 'weekly', start_date: weekStart, end_date: weekEnd };
      if (weeklyVenueId !== 'all') body.bar_id = weeklyVenueId;
      const { data, error } = await supabase.functions.invoke('generate-daily-insights', { body });
      if (error) throw error;
      const msg = data?.total_insights != null
        ? `Weekly insights generated: ${data.total_insights} insights, ${data.total_actions} actions`
        : `Weekly insights dispatched for ${data?.bars_dispatched || 0} venues`;
      toast.success(msg);
      setTimeout(fetchData, 3000);
    } catch (e: any) {
      toast.error('Weekly insights failed — check logs');
      console.error(e);
    } finally {
      setWeeklyRunning(false);
    }
  };

  const triggerBulkRecompute = async () => {
    if (!recomputeVenueId) { toast.error('Select a venue'); return; }
    setRecomputeRunning(true);
    setRecomputeProgress(null);
    const numWeeks = parseInt(recomputeWeeks) || 16;
    try {
      // Generate week starts going backwards from current week
      const weeks: string[] = [];
      const now = new Date();
      for (let i = 0; i < numWeeks; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        weeks.push(d.toISOString().slice(0, 10));
      }
      weeks.reverse();
      setRecomputeProgress({ done: 0, total: weeks.length });
      for (let i = 0; i < weeks.length; i++) {
        await supabase.functions.invoke('compute-weekly-scores', {
          body: { bar_id: recomputeVenueId, week_start: weeks[i] },
        });
        setRecomputeProgress({ done: i + 1, total: weeks.length });
      }
      toast.success(`Recomputed ${weeks.length} weeks for venue`);
      setTimeout(fetchData, 2000);
    } catch (e: any) {
      toast.error('Recompute failed');
      console.error(e);
    } finally {
      setRecomputeRunning(false);
      setRecomputeProgress(null);
    }
  };

  const triggerRedAlertsBackfill = async () => {
    setRedAlertsRunning(true);
    setRedAlertsProgress(null);
    const numWeeks = parseInt(redAlertsWeeks) || 8;
    try {
      // Build list of week_starts (Mondays) going back from prior completed week
      const weeks: string[] = [];
      const now = new Date();
      // start from the most recently completed week (i.e. prior Monday)
      const baseMonday = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      for (let i = 0; i < numWeeks; i++) {
        const d = new Date(baseMonday);
        d.setDate(d.getDate() - i * 7);
        weeks.push(format(d, 'yyyy-MM-dd'));
      }
      weeks.reverse();

      // Fetch active venues
      const { data: venueRows, error: vErr } = await supabase
        .from('venues')
        .select('id')
        .eq('is_active', true);
      if (vErr) throw vErr;
      const venueIds = (venueRows || []).map((v) => v.id);
      if (venueIds.length === 0) {
        toast.error('No active venues');
        return;
      }

      const jobs: Array<{ bar_id: string; week_start: string; week_end: string }> = [];
      for (const ws of weeks) {
        const we = format(endOfWeek(new Date(ws + 'T12:00:00'), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        for (const bar_id of venueIds) {
          jobs.push({ bar_id, week_start: ws, week_end: we });
        }
      }

      setRedAlertsProgress({ done: 0, total: jobs.length });
      let totalInserted = 0;
      const concurrency = 2;
      let cursor = 0;
      let done = 0;

      const runOne = async (job: { bar_id: string; week_start: string; week_end: string }) => {
        try {
          const { data, error } = await supabase.functions.invoke('generate-daily-insights', {
            body: {
              bar_id: job.bar_id,
              date: job.week_end,
              week_start: job.week_start,
              mode: 'weekly',
            },
          });
          if (error) throw error;
          const inserted = (data?.total_insights as number) ?? 0;
          totalInserted += inserted;
        } catch (e) {
          console.warn(`Red-alerts dispatch failed for ${job.bar_id} ${job.week_start}`, e);
        } finally {
          done += 1;
          setRedAlertsProgress({ done, total: jobs.length });
        }
      };

      const workers: Promise<void>[] = [];
      for (let i = 0; i < concurrency; i++) {
        workers.push((async () => {
          while (cursor < jobs.length) {
            const idx = cursor++;
            await runOne(jobs[idx]);
          }
        })());
      }
      await Promise.all(workers);

      toast.success(`Red-score alerts backfill complete: ${totalInserted} inserted across ${jobs.length} venue-weeks`);
      setTimeout(fetchData, 2000);
    } catch (e: any) {
      toast.error('Red-score backfill failed');
      console.error(e);
    } finally {
      setRedAlertsRunning(false);
      setRedAlertsProgress(null);
    }
  };

  const triggerInventoryInsights = async () => {
    setInventoryRunning(true);
    setInventoryProgress(null);
    try {
      // Find every inventory_report with a non-null total_missing_cost,
      // grouped by (venue_id, period_start, period_end).
      const { data: reports, error: rErr } = await supabase
        .from('inventory_reports')
        .select('venue_id, period_start, period_end, total_missing_cost')
        .not('total_missing_cost', 'is', null)
        .order('period_end', { ascending: false });
      if (rErr) throw rErr;

      const jobs = (reports || []).map((r: any) => ({
        bar_id: r.venue_id as string,
        week_start: r.period_start as string,
        week_end: r.period_end as string,
      }));

      if (jobs.length === 0) {
        toast.error('No inventory reports with totals found. Re-upload Sculpture CSVs first.');
        return;
      }

      setInventoryProgress({ done: 0, total: jobs.length });
      let totalInserted = 0;
      const concurrency = 2;
      let cursor = 0;
      let done = 0;

      const runOne = async (job: { bar_id: string; week_start: string; week_end: string }) => {
        try {
          const { data, error } = await supabase.functions.invoke('generate-daily-insights', {
            body: {
              bar_id: job.bar_id,
              date: job.week_end,
              week_start: job.week_start,
              mode: 'weekly',
            },
          });
          if (error) throw error;
          totalInserted += (data?.total_insights as number) ?? 0;
        } catch (e) {
          console.warn(`Inventory insights dispatch failed for ${job.bar_id} ${job.week_start}`, e);
        } finally {
          done += 1;
          setInventoryProgress({ done, total: jobs.length });
        }
      };

      const workers: Promise<void>[] = [];
      for (let i = 0; i < concurrency; i++) {
        workers.push((async () => {
          while (cursor < jobs.length) {
            const idx = cursor++;
            await runOne(jobs[idx]);
          }
        })());
      }
      await Promise.all(workers);

      toast.success(`Inventory insights generated: ${totalInserted} alerts across ${jobs.length} reports`);
      setTimeout(fetchData, 2000);
    } catch (e: any) {
      toast.error('Inventory insights backfill failed');
      console.error(e);
    } finally {
      setInventoryRunning(false);
      setInventoryProgress(null);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === 'error' || status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
    if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const statusBadge = (status: string) => {
    const variant = status === 'completed' ? 'default' : status === 'running' ? 'secondary' : 'destructive';
    return <Badge variant={variant} className="text-xs capitalize">{status}</Badge>;
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <EmployeeMatchingReviewCard />
      {/* Backfill Insights Card */}
      <Card className="bg-card border-border border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Backfill Daily Insights (Ops/Logs)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate daily (qualitative) insights retroactively for a date range. Only analyzes logs and operational data.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <CalendarIcon className="h-3 w-3" />
                  {format(backfillStart, 'MMM d')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={backfillStart}
                  onSelect={(d) => d && setBackfillStart(d)}
                  disabled={(d) => d > new Date()}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <CalendarIcon className="h-3 w-3" />
                  {format(backfillEnd, 'MMM d')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={backfillEnd}
                  onSelect={(d) => d && setBackfillEnd(d)}
                  disabled={(d) => d > new Date()}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              className="gap-2 text-xs"
              onClick={triggerBackfill}
              disabled={backfillRunning}
            >
              {backfillRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
              {backfillRunning ? 'Running...' : 'Run Backfill'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Insights Trigger Card */}
      <Card className="bg-card border-border border-accent/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent-foreground" />
            <span className="text-sm font-semibold">Generate Weekly Insights</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Run after manual data upload is complete. Analyzes sales, labor, scheduling, and cross-source patterns for the full week.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={weeklyVenueId} onValueChange={setWeeklyVenueId}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Venues</SelectItem>
                {venues.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <CalendarIcon className="h-3 w-3" />
                  Week of {format(weeklyDate, 'MMM d')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={weeklyDate}
                  onSelect={(d) => d && setWeeklyDate(startOfWeek(d, { weekStartsOn: 1 }))}
                  disabled={(d) => d > new Date()}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              className="gap-2 text-xs"
              onClick={triggerWeeklyInsights}
              disabled={weeklyRunning}
            >
              {weeklyRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart3 className="h-3 w-3" />}
              {weeklyRunning ? 'Running...' : 'Generate Weekly'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Recompute Scores Card */}
      <Card className="bg-card border-border border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Recompute Weekly Scores</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Recalculate scorecards from existing daily_metrics. Use after data uploads if scores appear stale.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={recomputeVenueId} onValueChange={setRecomputeVenueId}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={recomputeWeeks} onValueChange={setRecomputeWeeks}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">Last 4 weeks</SelectItem>
                <SelectItem value="8">Last 8 weeks</SelectItem>
                <SelectItem value="16">Last 16 weeks</SelectItem>
                <SelectItem value="26">Last 26 weeks</SelectItem>
                <SelectItem value="52">Last 52 weeks</SelectItem>
                <SelectItem value="52">Last 52 weeks</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="gap-2 text-xs"
              onClick={triggerBulkRecompute}
              disabled={recomputeRunning || !recomputeVenueId}
            >
              {recomputeRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calculator className="h-3 w-3" />}
              {recomputeRunning && recomputeProgress
                ? `${recomputeProgress.done}/${recomputeProgress.total}`
                : 'Recompute'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generate Red-Score Alerts Card */}
      <Card className="bg-card border-border border-destructive/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold">Generate Red-Score Alerts</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Backfill red-score alerts for all active venues across the selected number of past weeks. Runs deterministic Red Score triggers only — no AI, no token cost. Safe to re-run (deduped).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={redAlertsWeeks} onValueChange={setRedAlertsWeeks}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">Last 4 weeks</SelectItem>
                <SelectItem value="8">Last 8 weeks</SelectItem>
                <SelectItem value="16">Last 16 weeks</SelectItem>
                <SelectItem value="26">Last 26 weeks</SelectItem>
                <SelectItem value="52">Last 52 weeks</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="gap-2 text-xs"
              onClick={triggerRedAlertsBackfill}
              disabled={redAlertsRunning}
            >
              {redAlertsRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
              {redAlertsRunning && redAlertsProgress
                ? `${redAlertsProgress.done}/${redAlertsProgress.total}`
                : 'Generate Alerts'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generate Inventory Insights Card */}
      <Card className="bg-card border-border border-amber-500/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">Generate Inventory Insights</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Run the deterministic inventory-loss alert pass against every Sculpture report with a totaled missing-cost. No AI cost. Safe to re-run (deduped). Going forward, the Monday cron picks up new uploads automatically.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="gap-2 text-xs"
              onClick={triggerInventoryInsights}
              disabled={inventoryRunning}
            >
              {inventoryRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart3 className="h-3 w-3" />}
              {inventoryRunning && inventoryProgress
                ? `${inventoryProgress.done}/${inventoryProgress.total}`
                : 'Generate Inventory Insights'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SYNC_TYPES.map(st => {
          const latest = latestByType[st.key];
          return (
            <Card key={st.key} className="bg-card border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{st.label}</span>
                  {latest && statusIcon(latest.status)}
                </div>
                {latest ? (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>{latest.completed_at ? formatDistanceToNow(new Date(latest.completed_at), { addSuffix: true }) : 'Running...'}</p>
                    <p>{(latest.records_processed || 0)} processed · {(latest.records_created || 0)} created</p>
                    {latest.error_message && (
                      <div className="flex items-start gap-1 text-destructive">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{latest.error_message}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No runs yet</p>
                )}
                {st.key === 'weekly_scores' && (
                  <div className="flex items-center gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1 text-xs flex-1">
                          <CalendarIcon className="h-3 w-3" />
                          Wk of {format(scoresWeekDate, 'MMM d')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scoresWeekDate}
                          onSelect={(d) => d && setScoresWeekDate(startOfWeek(d, { weekStartsOn: 1 }))}
                          disabled={(d) => d > new Date()}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => triggerSync(st)} disabled={triggering === st.key}>
                  {triggering === st.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Sync Now
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Runs */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Recent Sync Runs</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchData} className="gap-2 text-xs">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="rounded-md border border-border overflow-x-auto -mx-3 sm:mx-0">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-muted-foreground text-xs">Type</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Started</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Records</TableHead>
                  <TableHead className="text-muted-foreground text-xs hidden md:table-cell">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">No sync runs found.</TableCell></TableRow>
                ) : recentRuns.map(run => (
                  <TableRow key={run.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm font-medium">{run.sync_type}</TableCell>
                    <TableCell>{statusBadge(run.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(run.started_at), 'MMM d, h:mm a')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{run.records_processed || 0} / {run.records_created || 0}</TableCell>
                    <TableCell className="text-xs text-destructive hidden md:table-cell max-w-[200px] truncate">{run.error_message || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
