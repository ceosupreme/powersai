import { useMemo, useState } from 'react';
import { useVenues } from '@/hooks/useVenueData';
import { useLatestLeakStackRun, useRunLeakStack, useLeakStackHistory, type LeakStackResult } from '@/hooks/useLeakStack';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, ChevronDown, Copy, ShieldAlert, TrendingDown, Loader2 } from 'lucide-react';
import { SOURCE_LABEL, SOURCE_TONE, formatDollars, buildHookSentence } from '@/lib/leakStackFormat';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LeakStack() {
  const { data: venues = [], isLoading: venuesLoading } = useVenues();
  const [venueId, setVenueId] = useState<string | null>(null);
  const effectiveVenueId = venueId ?? venues[0]?.id ?? null;

  const { data: latest, isLoading: latestLoading } = useLatestLeakStackRun(effectiveVenueId);
  const { data: history = [] } = useLeakStackHistory(effectiveVenueId);
  const run = useRunLeakStack(effectiveVenueId);

  const captured = useMemo(() => (latest?.results ?? []).filter(r => r.risk_type !== 'avoided_loss'), [latest]);
  const risk = useMemo(() => (latest?.results ?? []).filter(r => r.risk_type === 'avoided_loss'), [latest]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Leak Stack</h1>
          <p className="text-sm text-muted-foreground">Ranked leaks with honest dollar figures — activity is fact, dollars are labeled estimates.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={effectiveVenueId ?? ''} onValueChange={(v) => setVenueId(v)}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select project" /></SelectTrigger>
            <SelectContent>
              {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => run.mutate()} disabled={!effectiveVenueId || run.isPending} className="gap-2">
            {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {latest ? 'Refresh' : 'Run'}
          </Button>
        </div>
      </div>

      {venuesLoading || latestLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !latest ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <p className="text-muted-foreground">No leak stack run yet for this project.</p>
            <p className="text-xs text-muted-foreground">Click Run to compute — estimates are shown per leak with input basis.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardDescription>Estimated captured-revenue leaks</CardDescription></CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{formatDollars(latest.total_monthly_dollars)}/mo</div>
                <p className="text-xs text-muted-foreground mt-1">estimated — basis shown per leak</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Avoided-loss exposure</CardDescription></CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-6 w-6 text-amber-500" />
                  {formatDollars(latest.total_risk_exposure_dollars)}/mo
                </div>
                <p className="text-xs text-muted-foreground mt-1">risk exposure — kept separate from captured revenue</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">
            Last run {new Date(latest.computed_at).toLocaleString()} · {history.length} run{history.length === 1 ? '' : 's'} on file.
          </p>

          {captured.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingDown className="h-5 w-5" /> Captured-revenue leaks</h2>
              {captured.map((r, i) => <LeakCard key={r.name + i} result={r} />)}
            </section>
          )}

          {risk.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-500" /> Avoided-loss exposure</h2>
              {risk.map((r, i) => <LeakCard key={r.name + i} result={r} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function LeakCard({ result }: { result: LeakStackResult }) {
  const [open, setOpen] = useState(false);
  const hook = buildHookSentence(result);
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base">{result.name}</CardTitle>
            <Badge variant={result.severity === 'headline' ? 'destructive' : 'secondary'}>{result.severity}</Badge>
            {result.risk_type === 'avoided_loss' && <Badge variant="outline" className="border-amber-500/50 text-amber-600">avoided-loss</Badge>}
          </div>
          {result.benchmark && <p className="text-xs text-muted-foreground mt-1">{result.benchmark}</p>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-semibold">{formatDollars(result.monthly_dollars)}<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
          {result.reason && <p className="text-xs text-amber-600">{result.reason}</p>}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {result.monthly_dollars != null && (
          <div className="flex items-start justify-between gap-2 bg-muted/40 rounded-md p-2">
            <p className="text-sm italic">{hook}</p>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { navigator.clipboard.writeText(hook); toast.success('Copied'); }}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 h-7 px-2 text-xs">
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
              {open ? 'Hide inputs' : 'Show inputs'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-1">
            {result.inputs.length === 0 && <p className="text-xs text-muted-foreground">No formula variables.</p>}
            {result.inputs.map((inp) => (
              <div key={inp.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono">{inp.name}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{inp.unresolved ? '—' : (inp.value ?? '—')}</span>
                  {inp.source && (
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', SOURCE_TONE[inp.source])}>
                      {SOURCE_LABEL[inp.source]}
                    </Badge>
                  )}
                  {inp.caveat && <span className="text-[10px] text-amber-600">({inp.caveat})</span>}
                  {inp.unresolved && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/40">unresolved</Badge>}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}