import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Plug, Eye, Send, RefreshCw, AlertTriangle, CheckCircle2, ExternalLink, FlaskConical } from 'lucide-react';
import type { Campaign } from './types';
import { SyncStatusBadge } from './badges';
import { getAdapter, getAdapterMode, setAdapterMode, type AdapterMode } from './adapters/registry';
import type { DryRunPreview } from './adapters/types';
import { useActionPacksStore, useActionPacksLoader } from '@/components/growth-audit/action-packs/useActionPacks';
import { useAsanaSyncHealth, markAsanaSyncSuccess, useInvalidateSyncHealth } from './useAsanaSyncHealth';

const fmtDate = (s?: string | null) =>
  !s ? '—' : new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const ExecutionAdapterPanel = ({
  campaign, onCampaignChange,
}: {
  campaign: Campaign;
  onCampaignChange: (next: Campaign) => void;
}) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<AdapterMode>(getAdapterMode());
  const [preview, setPreview] = useState<DryRunPreview | null>(null);
  const [loading, setLoading] = useState<null | 'preview' | 'push' | 'sync'>(null);

  // Pull approved assets across all action packs for this finding/campaign.
  const { packs } = useActionPacksStore();
  useActionPacksLoader(campaign.venueId);
  const { data: syncHealth } = useAsanaSyncHealth(campaign.venueId);
  const invalidateHealth = useInvalidateSyncHealth(campaign.venueId);
  const linkedAssets = packs
    .filter(p => p.findingId === campaign.originatingFindingId)
    .flatMap(p => p.assets)
    .filter(a => a.approval === 'Approved');

  const adapter = getAdapter(campaign.executionAdapter?.adapter_type ?? 'asana');
  const liveEnabled = preview?.live_writes_enabled ?? false;
  const isMock = mode === 'mock';

  const switchMode = (next: AdapterMode) => {
    setAdapterMode(next); setMode(next); setPreview(null);
  };

  const runPreview = async () => {
    setLoading('preview');
    try {
      const p = await getAdapter(campaign.executionAdapter?.adapter_type ?? 'asana').previewPush(campaign, linkedAssets);
      setPreview(p);
    } catch (e: any) {
      toast({ title: 'Dry-run failed', description: e?.message ?? String(e), variant: 'destructive' });
    } finally { setLoading(null); }
  };

  const runPush = async () => {
    setLoading('push');
    try {
      const { adapter: rec } = await adapter.push(campaign, linkedAssets);
      onCampaignChange({
        ...campaign, executionAdapter: rec, syncLost: false,
        lastSyncedFrom: 'barpulse', updatedAt: new Date().toISOString(),
      });
      toast({ title: 'Pushed to Asana', description: `Task ${rec.external_id}` });
    } catch (e: any) {
      toast({ title: 'Push failed', description: e?.message ?? String(e), variant: 'destructive' });
    } finally { setLoading(null); }
  };

  const runSync = async () => {
    setLoading('sync');
    try {
      const res = await adapter.pull(campaign);
      if (res.syncLost) {
        onCampaignChange(adapter.markSyncLost(campaign));
        toast({ title: 'Sync Lost', description: 'Asana task no longer exists. Campaign preserved.', variant: 'destructive' });
      } else if (res.patch) {
        onCampaignChange({ ...campaign, ...res.patch, lastSyncedFrom: 'asana' });
        toast({ title: 'Synced from Asana' });
      }
      await markAsanaSyncSuccess(campaign.venueId);
      invalidateHealth();
    } catch (e: any) {
      toast({ title: 'Sync failed', description: e?.message ?? String(e), variant: 'destructive' });
    } finally { setLoading(null); }
  };

  return (
    <Card className="p-4 border-l-4 border-l-indigo-500/70">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plug className="w-4 h-4 text-muted-foreground" /> Execution adapter — Asana
        </h3>
        <div className="flex items-center gap-2">
          {campaign.executionAdapter && <SyncStatusBadge status={campaign.executionAdapter.sync_status} />}
          <button
            onClick={() => switchMode(isMock ? 'live' : 'mock')}
            className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border border-border/60 text-muted-foreground hover:text-foreground"
            title="Toggle Mock / Live adapter"
          >
            <FlaskConical className="w-3 h-3 inline mr-1" />{isMock ? 'Mock' : 'Live'}
          </button>
        </div>
      </div>

      {campaign.syncLost && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Sync Lost</div>
            <div>Asana task was deleted. Campaign and history preserved in BarPulse.</div>
          </div>
        </div>
      )}

      {syncHealth && syncHealth.consecutive_failures >= 3 && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-amber-700">Background sync failing ({syncHealth.consecutive_failures} consecutive failures)</div>
            {syncHealth.last_error && <div className="text-muted-foreground mt-0.5 line-clamp-2">Last error: {syncHealth.last_error}</div>}
            <Button size="sm" variant="outline" className="mt-1.5 h-6 text-[11px]" onClick={runSync} disabled={loading === 'sync'}>
              Retry now
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <Field label="External ID" value={campaign.executionAdapter?.external_id ?? '—'} />
        <Field label="Last synced" value={fmtDate(campaign.executionAdapter?.last_synced_at)} />
        <Field label="Last synced from" value={campaign.lastSyncedFrom ?? '—'} />
        <Field label="Mode" value={isMock ? 'Mock (no Asana writes)' : 'Live'} />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <Button size="sm" variant="outline" onClick={runPreview} disabled={loading === 'preview'} className="gap-1.5">
          <Eye className="w-3.5 h-3.5" /> {loading === 'preview' ? 'Loading…' : 'Preview Push (Dry Run)'}
        </Button>
        <Button
          size="sm"
          onClick={runPush}
          disabled={loading === 'push' || (!isMock && !liveEnabled) || !preview}
          className="gap-1.5"
          title={!isMock && !liveEnabled ? 'Enable live writes for this venue in Admin → Marketing Hub' : ''}
        >
          <Send className="w-3.5 h-3.5" /> {loading === 'push' ? 'Pushing…' : 'Push to Asana'}
        </Button>
        <Button
          size="sm" variant="outline" onClick={runSync}
          disabled={loading === 'sync' || !campaign.executionAdapter?.external_id}
          className="gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {loading === 'sync' ? 'Syncing…' : 'Sync Now'}
        </Button>
        {(campaign.executionAdapter as any)?.permalink_url && (
          <a
            href={(campaign.executionAdapter as any).permalink_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline px-2 py-1"
          >
            Open in Asana <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {preview && (
        <>
          <Separator className="my-3" />
          <DryRunView preview={preview} mock={isMock} />
        </>
      )}

      {!preview && !isMock && (
        <p className="text-[11px] text-muted-foreground">
          Run a dry-run preview before live writes. Push is disabled until the venue's live-writes flag is enabled
          in Admin → Marketing Hub.
        </p>
      )}
    </Card>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm text-foreground truncate">{value}</div>
  </div>
);

const DryRunView = ({ preview, mock }: { preview: DryRunPreview; mock: boolean }) => (
  <div className="space-y-3 text-xs">
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="border-indigo-500/40 text-indigo-600">Dry Run</Badge>
      {mock && <Badge variant="outline">Mock data</Badge>}
      {preview.live_writes_enabled
        ? <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 gap-1"><CheckCircle2 className="w-3 h-3" />Live writes enabled</Badge>
        : <Badge variant="outline" className="border-amber-500/40 text-amber-600">Live writes disabled</Badge>}
    </div>
    <Field label="Task name" value={preview.task_name} />
    <div className="grid grid-cols-3 gap-3">
      <Field label="Section" value={preview.section.name} />
      <Field label="Start" value={preview.start_on} />
      <Field label="Due" value={preview.due_on} />
    </div>
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Custom fields ({preview.custom_fields.length})</div>
      <ul className="space-y-0.5">
        {preview.custom_fields.map(f => (
          <li key={f.key} className="flex justify-between gap-3 border-b border-border/30 py-0.5">
            <span className="text-muted-foreground">{f.asana_name}</span>
            <span className="font-mono text-foreground truncate max-w-[60%] text-right">{f.value == null ? '—' : String(f.value)}</span>
          </li>
        ))}
      </ul>
    </div>
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Subtasks ({preview.subtasks.length})</div>
      <ul className="list-disc pl-4 space-y-0.5">
        {preview.subtasks.map(s => <li key={s}>{s}</li>)}
      </ul>
    </div>
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        Comments to post ({preview.comments.length})
      </div>
      {preview.comments.length === 0 ? (
        <div className="text-muted-foreground italic">No approved Action Pack assets linked to this campaign.</div>
      ) : (
        <ul className="space-y-1.5">
          {preview.comments.map(c => (
            <li key={c.asset_id} className="rounded border border-border/40 p-1.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Badge variant="outline" className="text-[10px]">{c.kind}</Badge>
              </div>
              <div className="text-foreground line-clamp-2">{c.preview}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
    {preview.attachments.length > 0 && (
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Attachments</div>
        <ul className="space-y-0.5">
          {preview.attachments.map(a => (
            <li key={a.filename} className="flex justify-between">
              <span>{a.filename}</span>
              <span className="text-muted-foreground">{a.size_bytes ? `${(a.size_bytes / 1024).toFixed(0)} KB` : '—'}</span>
            </li>
          ))}
        </ul>
        <div className="text-[10px] text-muted-foreground mt-1">Max 10MB per attachment.</div>
      </div>
    )}
  </div>
);
