import { useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STUDIO_METRICS, studioResultMetrics, studioUrl } from '@/lib/contentStudio';
import { useStudioMutations, useStudioResults } from '@/hooks/useContentStudio';

export function StudioResults({ itemId }: { itemId: string }) {
  const observations = useStudioResults(itemId);
  const { recordResult } = useStudioMutations();
  const [placementId, setPlacementId] = useState('manual');
  const [values, setValues] = useState<Record<string, string>>({ platform: 'youtube', captured_on: new Date().toISOString().slice(0, 10) });
  const change = (key: string, value: string) => setValues(previous => ({ ...previous, [key]: value }));
  const save = async () => {
    try {
      const metrics = studioResultMetrics(values);
      if (!metrics.post_url) throw new Error('Add a live post URL or choose a published placement.');
      await recordResult.mutateAsync({ itemId, placementId: placementId === 'manual' ? null : placementId, metrics });
      toast.success('Measured results saved with this piece and its template');
    } catch (error: any) { toast.error(error.message || 'The results could not be saved.'); }
  };
  return <section className="space-y-4 border-t pt-5" aria-labelledby="studio-results">
    <h2 id="studio-results" className="flex items-center gap-2 font-semibold"><BarChart3 className="h-5 w-5 text-primary" />Learn from the published piece</h2>
    <p className="text-sm text-muted-foreground">Record actual platform numbers. HQ keeps the template version and creative choices with the results so the next piece can build on evidence.</p>
    <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">Record a performance check</summary><div className="mt-4 space-y-4">
      <label className="block space-y-2 text-sm"><span className="font-medium">Published post</span><Select value={placementId} onValueChange={id => {
        setPlacementId(id); const placement = observations.data?.placements.find(p => p.id === id);
        if (placement) setValues(previous => ({ ...previous, post_url: placement.live_url || '', platform: placement.channel === 'facebook_page' ? 'facebook' : placement.channel }));
      }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Enter the live post link</SelectItem>{observations.data?.placements.filter(p => studioUrl(p.live_url)).map(p => <SelectItem key={p.id} value={p.id}>{p.channel} · {p.live_url}</SelectItem>)}</SelectContent></Select></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-2 text-sm"><span className="font-medium">Platform</span><Select value={values.platform} onValueChange={value => change('platform', value)} disabled={placementId !== 'manual'}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['youtube', 'instagram', 'tiktok', 'facebook', 'pinterest', 'threads', 'x', 'other'].map(platform => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}</SelectContent></Select></label><label className="block space-y-2 text-sm"><span className="font-medium">Date observed</span><Input type="date" value={values.captured_on || ''} onChange={e => change('captured_on', e.target.value)} /></label></div>
      <label className="block space-y-2 text-sm"><span className="font-medium">Live post URL</span><Input value={values.post_url || ''} onChange={e => change('post_url', e.target.value)} disabled={placementId !== 'manual'} placeholder="https://…" /></label>
      <p className="text-xs text-muted-foreground">Leave unknown values blank. Enter 0 only when the platform reports zero.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{STUDIO_METRICS.map(metric => <label key={metric.key} className="block space-y-2 text-sm"><span>{metric.label}</span><Input inputMode="numeric" type="number" min="0" step="1" value={values[metric.key] || ''} onChange={e => change(metric.key, e.target.value)} placeholder="Unknown" /></label>)}</div>
      <label className="block space-y-2 text-sm"><span className="font-medium">What did you learn?</span><Textarea rows={3} value={values.notes || ''} onChange={e => change('notes', e.target.value)} placeholder="Audience responses, where attention dropped, or what to change next time" /></label>
      <Button disabled={recordResult.isPending} onClick={save}>{recordResult.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save measured results</Button>
    </div></details>
    {observations.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading recorded results…</p>}
    {observations.isError && <p role="alert" className="text-sm text-destructive">Recorded results could not be loaded. Try refreshing.</p>}
    {observations.data?.results.map(result => <div key={result.id} className="space-y-2 rounded-lg bg-muted/40 p-3"><div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span className="capitalize">{result.platform} · {result.captured_on}</span>{studioUrl(result.post_url) && <a href={result.post_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Open post</a>}</div><div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">{STUDIO_METRICS.filter(metric => result[metric.key] != null).map(metric => <span key={metric.key}>{Number(result[metric.key]).toLocaleString()} {metric.label.toLowerCase()}</span>)}</div>{result.notes && <p className="text-xs text-muted-foreground">{result.notes}</p>}</div>)}
  </section>;
}
