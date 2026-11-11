import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { nextStageForFormat, flowForFormat, STAGE_LABELS } from './contentStages';
import { canApprove, useApproveItem } from '@/hooks/useContentProduction';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type Mode = 'work' | 'schedule' | 'publish';
type WorkItem = {
  id: string; title: string; format: string | null; stage: string;
  brief: unknown; hook: string | null; cta: string | null;
  approved_at: string | null; quality_score: number | null;
  quality_fails: string[] | null; updated_at: string;
};
type Placement = {
  id: string; channel: string; account_label: string | null; status: string;
  scheduled_for: string | null; live_url: string | null; receipt: unknown;
};
type BrandChannel = { platform: string; url: string | null; status: string };
const T = (name: string) => (supabase as any).from(name);
const OUTLETS = ['instagram','facebook','tiktok','youtube','pinterest','blog','email','linkedin','x','other'];

function objectValue(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  if (typeof v === 'string') {
    try { const j = JSON.parse(v); if (j && typeof j === 'object' && !Array.isArray(j)) return j; }
    catch { return { summary: v }; }
  }
  return {};
}
function str(v: unknown): string { return typeof v === 'string' ? v : ''; }
function linkValid(v: string): boolean {
  try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; }
  catch { return false; }
}
function outlet(platform: string): string {
  if (platform === 'facebook_page') return 'facebook';
  if (platform === 'youtube_channel') return 'youtube';
  return OUTLETS.includes(platform) ? platform : 'other';
}
function assetLines(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Manual schedule records do not call an external publisher. */
export function ContentWorkflowDialog(props: { projectId: string; itemId: string | null; onClose: () => void }) {
  const { projectId, itemId, onClose } = props;
  const { user } = useAuth();
  const qc = useQueryClient();
  const approval = useApproveItem();
  const [mode, setMode] = useState<Mode>('work');
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [caption, setCaption] = useState('');
  const [assetText, setAssetText] = useState('');
  const [channel, setChannel] = useState('instagram');
  const [account, setAccount] = useState('');
  const [when, setWhen] = useState('');
  const [externalConfirmation, setExternalConfirmation] = useState(false);
  const [reference, setReference] = useState('');
  const [liveUrl, setLiveUrl] = useState('');

  const itemQuery = useQuery({
    queryKey: ['content-workflow', projectId, itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<WorkItem> => {
      const { data, error } = await T('content_items')
        .select('id,title,format,stage,brief,hook,cta,approved_at,quality_score,quality_fails,updated_at')
        .eq('id', itemId).eq('project_id', projectId).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This post is not available in the selected brand.');
      return data;
    },
  });
  const placements = useQuery({
    queryKey: ['content-workflow-placements', projectId, itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<Placement[]> => {
      const { data, error } = await T('content_placements')
        .select('id,channel,account_label,status,scheduled_for,live_url,receipt')
        .eq('content_item_id', itemId).eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const brandChannels = useQuery({
    queryKey: ['content-workflow-channels', projectId],
    enabled: !!itemId,
    queryFn: async (): Promise<BrandChannel[]> => {
      const { data, error } = await T('brand_channels')
        .select('platform,url,status').eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
  });
  const item = itemQuery.data;
  const brief = useMemo(() => objectValue(item?.brief), [item?.brief]);
  useEffect(() => {
    if (!item) return;
    const v = objectValue(item.brief);
    setTitle(item.title);
    setScript(str(v.script));
    setCaption(str(v.caption));
    setAssetText(assetLines(v.asset_urls).join('\n'));
    setMode('work');
    setExternalConfirmation(false);
    setReference('');
    setLiveUrl('');
  }, [item?.id, item?.updated_at]);

  const options = useMemo(() => {
    const live = new Set((brandChannels.data ?? []).filter(c => c.status === 'live').map(c => outlet(c.platform)));
    return live.size ? OUTLETS.filter(o => live.has(o)) : OUTLETS;
  }, [brandChannels.data]);
  useEffect(() => {
    if (options.length && !options.includes(channel)) setChannel(options[0]);
  }, [options, channel]);
  const accountUrl = (brandChannels.data ?? []).find(c => outlet(c.platform) === channel && c.url)?.url;
  const matching = (placements.data ?? []).find(p => p.channel === channel &&
    (p.account_label ?? '') === account.trim() && p.status !== 'published');
  const next = item ? nextStageForFormat(item.stage, item.format) : null;
  const assets = assetText.split('\n').map(v => v.trim()).filter(Boolean);
  const badAsset = assets.find(v => !linkValid(v));

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['content-workflow', projectId, itemId] }),
      qc.invalidateQueries({ queryKey: ['content-workflow-placements', projectId, itemId] }),
      qc.invalidateQueries({ queryKey: ['production-board-items'] }),
      qc.invalidateQueries({ queryKey: ['brand-manager-posts', projectId] }),
      qc.invalidateQueries({ queryKey: ['brand-workspace'] }),
      qc.invalidateQueries({ queryKey: ['content-items'] }),
    ]);
  };
  const persistWork = async () => {
    if (!item || !title.trim()) throw new Error('This post needs a title.');
    if (badAsset) throw new Error('The production file link is invalid: ' + badAsset);
    const { data, error } = await T('content_items')
      .update({ title: title.trim(), brief: { ...brief, script, caption, asset_urls: assets } })
      .eq('id', item.id).eq('project_id', projectId).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('The post could not be saved with your permissions.');
  };
  const saveWork = async (advance = false) => {
    if (!item) return;
    // Publishing or scheduling requires a record with the platform and evidence.
    // Never advance either stage through the generic content-step button.
    if (advance && next === 'scheduled') { setMode('schedule'); return; }
    if (advance && next === 'published') { setMode('publish'); return; }
    if (advance && item.stage === 'script' && !script.trim()) return toast.error('Write the script before advancing.');
    if (advance && ['record','edit','design','thumbnail'].includes(item.stage) && !assets.length)
      return toast.error('Add the link to the completed production file before advancing.');
    setBusy(true);
    try {
      await persistWork();
      if (advance && next && next !== item.stage) {
        const { data, error } = await T('content_items').update({ stage: next })
          .eq('id', item.id).eq('project_id', projectId).select('id').maybeSingle();
        if (error || !data) throw error ?? new Error('Saved work, but the stage did not advance.');
      }
      toast.success(advance && next ? 'Work saved and moved to ' + next : 'Script, caption and links saved.');
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? 'Could not save.'); }
    finally { setBusy(false); }
  };
  const approve = async () => {
    if (!item) return;
    if (!canApprove(item)) return toast.error('Approval requires quality 80 or higher and no hard failures.');
    setBusy(true);
    try { await approval.mutateAsync(item.id); await refresh(); toast.success('Content approved.'); }
    catch (e: any) { toast.error(e?.message ?? 'Could not approve.'); }
    finally { setBusy(false); }
  };
  const persistPlacement = async (values: Record<string, unknown>) => {
    if (!item) throw new Error('No post selected.');
    if (matching) {
      const { data, error } = await T('content_placements').update(values)
        .eq('id', matching.id).eq('project_id', projectId).select('id').maybeSingle();
      if (error || !data) throw error ?? new Error('Placement update was refused.');
    } else {
      const { data, error } = await T('content_placements').insert({
        ...values, content_item_id: item.id, project_id: projectId,
      }).select('id').maybeSingle();
      if (error || !data) throw error ?? new Error('Placement creation was refused.');
    }
  };
  const schedule = async () => {
    if (!item || !when) return toast.error('Choose a date and time.');
    const date = new Date(when);
    if (!Number.isFinite(date.valueOf())) return toast.error('Choose a valid date and time.');
    if (externalConfirmation && !item.approved_at) return toast.error('Approve the post before confirming scheduling.');
    if (externalConfirmation && !reference.trim()) return toast.error('Add the external scheduling confirmation or reference.');
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await persistPlacement({
        channel, account_label: account.trim() || null,
        status: externalConfirmation ? 'scheduled' : 'draft',
        scheduled_for: date.toISOString(),
        receipt: {
          source: 'manual', recorded_by: user?.id ?? null, recorded_at: now,
          intent: externalConfirmation ? 'external_schedule_confirmed_by_operator' : 'schedule_not_submitted',
          confirmation_reference: externalConfirmation ? reference.trim() : null,
        },
      });
      if (externalConfirmation) {
        const { data, error } = await T('content_items')
          .update({ stage: 'scheduled', scheduled_at: date.toISOString() })
          .eq('id', item.id).eq('project_id', projectId).select('id').maybeSingle();
        if (error || !data) throw error ?? new Error('Schedule recorded but the content stage update failed.');
        toast.success('Manual scheduling confirmation recorded. HQ did not post anything.');
      } else toast.success('Date saved as a plan only. Nothing was scheduled externally.');
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? 'Could not save scheduling details.'); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    if (!item || !linkValid(liveUrl.trim())) return toast.error('Add the real public link to the live post.');
    if (!item.approved_at) return toast.error('Approve the post before recording publication.');
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await persistPlacement({
        channel, account_label: account.trim() || null, status: 'published',
        live_url: liveUrl.trim(), verified_at: now,
        receipt: { source: 'manual', recorded_by: user?.id ?? null, recorded_at: now,
          intent: 'operator_confirmed_publication', live_url: liveUrl.trim() },
      });
      const { data, error } = await T('content_items')
        .update({ stage: 'published', published_at: now })
        .eq('id', item.id).eq('project_id', projectId).select('id').maybeSingle();
      if (error || !data) throw error ?? new Error('Live link was saved but stage update failed.');
      toast.success('Live link recorded by you. It has not been independently verified.');
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? 'Could not record publication.'); }
    finally { setBusy(false); }
  };

  return <Dialog open={!!itemId} onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{item?.title ?? 'Content workflow'}</DialogTitle>
        <DialogDescription>Finish content, record an external scheduling confirmation, or record a live link.</DialogDescription>
      </DialogHeader>
      {itemQuery.isLoading ? <p>Loading content…</p> : itemQuery.isError
        ? <p role="alert">{(itemQuery.error as Error)?.message ?? 'Content unavailable.'}</p>
        : item ? <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{STAGE_LABELS[item.stage as keyof typeof STAGE_LABELS] ?? item.stage}</Badge>
            <Badge>{item.approved_at ? 'Approved' : 'Needs approval'}</Badge>
            <Badge variant="outline">Quality {item.quality_score ?? 'Not scored'}</Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant={mode === 'work' ? 'default' : 'outline'} size="sm" onClick={() => setMode('work')}>Create & edit</Button>
            <Button variant={mode === 'schedule' ? 'default' : 'outline'} size="sm" onClick={() => setMode('schedule')}>Schedule</Button>
            <Button variant={mode === 'publish' ? 'default' : 'outline'} size="sm" onClick={() => setMode('publish')}>Record publication</Button>
          </div>
          {mode === 'work' && <div className="space-y-3">
            <label className="block space-y-1"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)}/></label>
            <label className="block space-y-1"><Label>Script or main text</Label><Textarea rows={8} value={script} onChange={e => setScript(e.target.value)}/></label>
            <label className="block space-y-1"><Label>Caption</Label><Textarea rows={4} value={caption} onChange={e => setCaption(e.target.value)}/></label>
            <label className="block space-y-1"><Label>Production file links (one per line)</Label>
              <Textarea rows={3} value={assetText} onChange={e => setAssetText(e.target.value)} placeholder="https://..."/>
              <span className="block text-xs text-muted-foreground">Links to existing files; this form does not upload media.</span>
            </label>
            {item.hook && <p className="text-xs"><strong>Hook:</strong> {item.hook}</p>}
            {item.cta && <p className="text-xs"><strong>Call to action:</strong> {item.cta}</p>}
            <div className="flex gap-2 flex-wrap">
              <Button disabled={busy} onClick={() => saveWork()}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}Save work</Button>
              {next && next !== item.stage && <Button disabled={busy} variant="outline" onClick={() => saveWork(true)}>
                {next === 'scheduled' ? 'Choose where and when to post' :
                  next === 'published' ? 'Record the live post and its link' :
                  'Save and continue to ' + STAGE_LABELS[next]}
              </Button>}
              {!item.approved_at && <Button disabled={busy || !canApprove(item)} variant="outline" onClick={approve}>Approve finished content</Button>}
            </div>
            {!item.approved_at && !canApprove(item) && <p className="text-xs text-muted-foreground">Approval requires a quality score of at least 80 and no hard failures. Saving does not approve anything.</p>}
            <p className="text-xs text-muted-foreground">Production route: {flowForFormat(item.format).map(s => STAGE_LABELS[s]).join(' → ')}</p>
          </div>}
          {(mode === 'schedule' || mode === 'publish') && <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{mode === 'schedule'
              ? 'HQ does not schedule posts on external platforms yet. Save your plan or record a scheduling confirmation from the platform.'
              : 'Only record publication after you have opened the live post and confirmed its real URL.'}</p>
            <label className="block space-y-1"><Label>Platform</Label>
              <select className="w-full p-2 rounded-md bg-background border" value={channel} onChange={e => { setChannel(e.target.value); setAccount(''); }}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="block space-y-1"><Label>Account or handle (optional)</Label><Input value={account} onChange={e => setAccount(e.target.value)} placeholder="@youraccount"/></label>
            {accountUrl && <a className="inline-flex gap-1 text-sm text-primary underline" href={accountUrl} target="_blank" rel="noreferrer">Open this account <ExternalLink className="h-4 w-4"/></a>}
            {mode === 'schedule' ? <>
              <label className="block space-y-1"><Label>Planned date and time (your local timezone)</Label><Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)}/></label>
              <label className="flex gap-2 items-start text-sm">
                <input type="checkbox" className="mt-1" checked={externalConfirmation} onChange={e => setExternalConfirmation(e.target.checked)}/>
                <span>I already scheduled this in the external platform.</span>
              </label>
              {externalConfirmation && <label className="block space-y-1"><Label>Confirmation link or reference</Label><Input value={reference} onChange={e => setReference(e.target.value)}/></label>}
              <Button disabled={busy || !when || placements.isLoading} onClick={schedule}>{externalConfirmation ? 'Record manual scheduling confirmation' : 'Save plan (not scheduled yet)'}</Button>
            </> : <>
              <label className="block space-y-1"><Label>Public URL of the live post</Label><Input type="url" value={liveUrl} onChange={e => setLiveUrl(e.target.value)} placeholder="https://..."/></label>
              <Button disabled={busy || placements.isLoading || !item.approved_at || !linkValid(liveUrl.trim())} onClick={publish}>Record live post manually</Button>
            </>}
          </div>}
          {(placements.data?.length ?? 0) > 0 && <section className="border-t pt-3 space-y-2">
            <h3 className="font-semibold text-sm">Publishing records</h3>
            {placements.data!.map(p => <div className="rounded-md border p-2 text-xs space-y-1" key={p.id}>
              <p className="font-medium">{p.channel}{p.account_label ? ' · ' + p.account_label : ''}</p>
              <p>{p.status === 'draft' && p.scheduled_for ? 'Planned, not scheduled' :
                p.status === 'scheduled' ? 'Manual external schedule confirmed (not API-verified)' :
                p.status === 'published' ? 'Publication manually confirmed' : p.status}</p>
              {p.scheduled_for && <p>Planned: {new Date(p.scheduled_for).toLocaleString()}</p>}
              {p.live_url && <a className="text-primary underline" href={p.live_url} rel="noreferrer" target="_blank">Open live link</a>}
            </div>)}
          </section>}
        </div> : null}
    </DialogContent>
  </Dialog>;
}
