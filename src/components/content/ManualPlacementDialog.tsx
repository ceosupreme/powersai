import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PLACEMENT_CHANNELS, type BoardItem } from '@/hooks/useContentProduction';
import { toast } from 'sonner';

type Mode = 'schedule' | 'publish';

function httpUrl(raw: string): string | null {
  try {
    const value = new URL(raw.trim());
    return value.protocol === 'https:' || value.protocol === 'http:' ? value.href : null;
  } catch { return null; }
}

/** This dialog records a user's manual action, never claims an API scheduler sent the post. */
export function ManualPlacementDialog({ item, mode, onClose }: {
  item: (Pick<BoardItem, 'id' | 'project_id' | 'title'> & { placements?: BoardItem['placements'] }) | null;
  mode: Mode;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState<string>('instagram');
  const [account, setAccount] = useState('');
  const [when, setWhen] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setChannel(item?.placements?.[0]?.channel ?? 'instagram');
    setAccount(item?.placements?.[0]?.account_label ?? '');
    setWhen('');
    setLiveUrl('');
    setConfirmed(false);
  }, [item?.id, mode]);

  const submit = async () => {
    if (!item) return;
    if (!confirmed) return toast.error('Confirm the action you already completed on the platform.');
    if (!PLACEMENT_CHANNELS.includes(channel as typeof PLACEMENT_CHANNELS[number])) return toast.error('Choose a supported platform.');
    if (mode === 'schedule' && (!when || !Number.isFinite(new Date(when).getTime()))) return toast.error('Enter the scheduled date and time.');
    const url = mode === 'publish' ? httpUrl(liveUrl) : null;
    if (mode === 'publish' && !url) return toast.error('Enter the live post URL, including https://.');

    setBusy(true);
    try {
      const T = (table: string) => (supabase as any).from(table);
      const { data: approval, error: approvalError } = await T('content_items')
        .select('approved_at,stage').eq('id', item.id).eq('project_id', item.project_id).maybeSingle();
      if (approvalError || !approval) throw approvalError ?? new Error('This post cannot be opened for your brand.');
      if (!approval.approved_at) throw new Error('Approve the content before scheduling or publishing it.');
      if (approval.stage === 'published' && mode === 'schedule') {
        throw new Error('This post is already marked published. Do not move it back into scheduling.');
      }
      // Re-check the database so retrying a partially saved action cannot create duplicates.
      const { data: existing, error: lookupError } = await T('content_placements')
        .select('id')
        .eq('content_item_id', item.id)
        .eq('project_id', item.project_id)
        .eq('channel', channel)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lookupError) throw lookupError;
      const current = existing?.id ?? null;
      const placementPatch = mode === 'schedule'
        ? { status: 'scheduled', scheduled_for: new Date(when).toISOString(), account_label: account.trim() || null }
        : { status: 'published', live_url: url, verified_at: new Date().toISOString(), account_label: account.trim() || null };
      const placement = current
        ? await T('content_placements').update(placementPatch).eq('id', current).eq('project_id', item.project_id).select('id').maybeSingle()
        : await T('content_placements').insert({
            content_item_id: item.id,
            project_id: item.project_id,
            channel,
            ...placementPatch,
          }).select('id').maybeSingle();
      if (placement.error || !placement.data) throw placement.error ?? new Error('The platform record was not saved.');

      const stage = mode === 'schedule' ? 'scheduled' : 'published';
      const patch = mode === 'schedule'
        ? { stage, scheduled_at: new Date(when).toISOString() }
        : { stage, published_at: new Date().toISOString() };
      const { data: changed, error } = await T('content_items').update(patch)
        .eq('id', item.id).eq('project_id', item.project_id).select('id').maybeSingle();
      if (error || !changed) throw error ?? new Error('Placement saved, but the post stage could not be updated. Please report this partial result.');

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['production-board-items'] }),
        qc.invalidateQueries({ queryKey: ['content-items'] }),
        qc.invalidateQueries({ queryKey: ['brand-workspace'] }),
      ]);
      toast.success(mode === 'schedule'
        ? 'Manual scheduling recorded. HQ did not send this to the platform.'
        : 'Publication manually confirmed from your live URL; no platform API verification occurred.');
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not record the platform action.');
    } finally { setBusy(false); }
  };

  return <Dialog open={!!item} onOpenChange={(open) => !open && !busy && onClose()}>
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{mode === 'schedule' ? 'Record manual scheduling' : 'Confirm a published post'}</DialogTitle>
        <DialogDescription>{item?.title}</DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        {mode === 'schedule'
          ? 'First schedule this post in the actual platform or publishing tool. HQ does not send it for you. Then record the details below.'
          : 'Only confirm publication after opening the real post on the platform. HQ records this as your manual verification, not an API-confirmed publication.'}
      </p>
      <div className="space-y-3">
        <div className="space-y-1"><Label htmlFor="manual-platform">Platform</Label>
          <select id="manual-platform" value={channel} onChange={(e) => setChannel(e.target.value)}
            className="w-full rounded-md border bg-background p-2 text-sm">
            {PLACEMENT_CHANNELS.map((platform) => <option key={platform} value={platform}>{platform.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="space-y-1"><Label htmlFor="manual-account">Account / page (optional)</Label>
          <Input id="manual-account" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="@yourbrand" />
        </div>
        {mode === 'schedule' ? (
          <div className="space-y-1"><Label htmlFor="manual-time">Scheduled date and time (your timezone)</Label>
            <Input id="manual-time" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
        ) : (
          <div className="space-y-1"><Label htmlFor="manual-live-link">Live post URL</Label>
            <Input id="manual-live-link" type="url" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://..." />
          </div>
        )}
        <label className="flex gap-2 items-start text-sm">
          <Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(!!value)} />
          <span>I confirm I {mode === 'schedule' ? 'scheduled this in the actual platform or publishing tool' : 'opened this live post on the platform'}.</span>
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button disabled={busy || !confirmed} onClick={submit}>{busy ? 'Saving…' : 'Save manual confirmation'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
