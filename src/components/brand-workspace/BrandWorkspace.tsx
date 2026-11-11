import { PainUsageBadge } from '@/components/pipeline/PainUsageBadge';
import { EditCrmRecord } from '@/components/crm/EditCrmRecord';
import { ReactNode, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ExternalLink, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatting';
import {
  CHANNEL_STATUSES, jobByTarget, useBrandActivity, useBrandChannels, useBrandIntel, useBrandKitAssetsView,
  useBrandWorkSummary, useKnowledgeRows, useProjectDocuments, useProjectJobs, useProjectProducts,
  useUpdateBrandChannel, type BrandChannel, type KnowledgeRow,
} from '@/hooks/useBrandWorkspace';
import { useCompleteNextTenRow, priorityLabel } from '@/hooks/useNextTen';
import { useApproveItem, useAdvanceStage, useProductionBoardItems, canApprove, type BoardItem } from '@/hooks/useContentProduction';
import { ProductionItemCard } from '@/components/content/ProductionItemCard';
import { ContentWorkflowDialog } from '@/components/content/ContentWorkflowDialog';
import { STAGE_LABELS, nextStageForFormat } from '@/components/content/contentStages';
import { useFoundationScores } from '@/components/foundation-audit/useFoundationScores';
import { useUpsertFoundationItemStatus } from '@/hooks/useFoundationItemStatus';
import { laneScore } from '@/lib/effectiveFoundation';
import { getSignedUrl } from '@/hooks/useBrandKit';
import { BrandKitLink } from './BrandKitLink';
import { PRIORITY_CHIP } from '@/components/portfolio/AllBrandsWaitingStrip';
import {
  dimensionShelf, isChannelStale, pipelineHref, platformLabel, relativeTime,
} from '@/lib/ownerWork';
import { CreatePipelineDialog, contentItemFromPain, type PipelineRequest } from '@/components/pipeline/CreatePipelineDialog';
import { PlaybooksTab } from './PlaybooksTab';
import { SetupLine, SetupTab } from './SetupTab';
import { ScreenshotStatsDialog, StatsHistory, latestLine } from './ChannelStats';
import { useChannelStats } from '@/hooks/useBrandSetup';
import { outletToDestination, productTypeForFormat, productTypeForName } from '@/lib/pipelineComposer';

export const WORKSPACE_TABS = [
  { key: 'overview', label: 'Today', description: 'Your next step, upcoming work, and how this brand is doing.', accent: 'border-primary text-primary' },
  { key: 'setup', label: 'Accounts to set up', description: 'See which brand accounts and profiles are ready and which need attention.', accent: 'border-primary text-primary' },
  { key: 'channels', label: 'Social accounts', description: 'Review your pages, followers, posting activity, and account details.', accent: 'border-signal-green text-signal-green' },
  { key: 'avenues', label: 'Ways to make money', description: 'Explore revenue opportunities and see which ones are already running.', accent: 'border-gold text-gold' },
  { key: 'products', label: 'What you sell', description: 'See products and services, their status, and the work to launch them.', accent: 'border-orange text-orange' },
  { key: 'content', label: 'Posts and videos', description: 'Follow each piece of content from its idea to verified publication.', accent: 'border-blue-500 text-blue-600' },
  { key: 'intel', label: 'What your audience asks', description: 'Discover customer questions and the content or offers that answer them.', accent: 'border-accent-foreground text-accent-foreground' },
  { key: 'playbooks', label: 'How-to guides', description: 'Find the instructions HQ uses for repeatable, quality work.', accent: 'border-foreground text-foreground' },
  { key: 'assets', label: 'Files and documents', description: 'Find brand files, useful links, and reference documents.', accent: 'border-muted-foreground text-muted-foreground' },
] as const;
type TabKey = (typeof WORKSPACE_TABS)[number]['key'];

const dash = (v: unknown) => (v == null || v === '' ? '—' : String(v));

export function BrandWorkspace({
  projectId,
  isAdmin,
  overallScore,
  nextTen,
  pillars,
  setup,
}: {
  projectId: string;
  isAdmin: boolean;
  overallScore: number | null | undefined;
  nextTen: ReactNode;
  pillars: ReactNode;
  setup: ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabKey = (WORKSPACE_TABS.find((t) => t.key === raw)?.key ?? 'overview') as TabKey;
  const select = (key: TabKey) => {
    const next = new URLSearchParams(params);
    if (key === 'overview') next.delete('tab');
    else next.set('tab', key);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-5">
      <nav
        role="tablist"
        aria-label="Brand workspace"
        className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]"
      >
        {WORKSPACE_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => select(t.key)}
            className={cn(
              'shrink-0 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === t.key ? t.accent : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <p className="text-sm text-muted-foreground" role="status">
        {WORKSPACE_TABS.find((t) => t.key === tab)?.description}
      </p>

      {tab === 'overview' && (
        <OverviewTab projectId={projectId} overallScore={overallScore} nextTen={nextTen} pillars={pillars} setup={setup} onOpenSetup={() => select('setup')} />
      )}
      {tab === 'setup' && <SetupTab projectId={projectId} canEdit={isAdmin} />}
      {tab === 'channels' && <ChannelsTab projectId={projectId} isAdmin={isAdmin} />}
      {tab === 'avenues' && <AvenuesTab projectId={projectId} canEdit={isAdmin} />}
      {tab === 'products' && <ProductsTab projectId={projectId} />}
      {tab === 'content' && <ContentTab projectId={projectId} />}
      {tab === 'intel' && <IntelTab projectId={projectId} />}
      {tab === 'playbooks' && <PlaybooksTab projectId={projectId} />}
      {tab === 'assets' && <AssetsTab projectId={projectId} />}
    </div>
  );
}

function Loading() {
  return <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
}
function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <p role="status" className="text-sm text-destructive">
      This section could not be loaded. <button className="underline" onClick={onRetry}>Try again</button>
    </p>
  );
}

// ---------------- Overview ----------------
function OverviewTab({
  projectId, overallScore, nextTen, pillars, setup, onOpenSetup,
}: { projectId: string; overallScore: number | null | undefined; nextTen: ReactNode; pillars: ReactNode; setup: ReactNode; onOpenSetup: () => void }) {
  const summary = useBrandWorkSummary(projectId);
  const listSize = useQuery({
    queryKey: ['brand-workspace', 'list-size', projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('project_kpi_values')
        .select('kpi_key,actual,week_start')
        .eq('project_id', projectId)
        .not('actual', 'is', null)
        .or('kpi_key.ilike.%email%,kpi_key.ilike.%list%')
        .order('week_start', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0]?.actual == null ? null : Number(data[0].actual);
    },
  });
  const activity = useBrandActivity(projectId);
  const complete = useCompleteNextTenRow();
  const approve = useApproveItem();
  const s = summary.data;

  const tiles: { label: string; value: string }[] = [
    { label: 'Overall score', value: overallScore == null ? '—' : String(overallScore) },
    { label: 'Revenue this month', value: s?.revenueMonth == null ? '—' : formatCurrency(s.revenueMonth) },
    { label: 'List size', value: listSize.data == null ? '—' : listSize.data.toLocaleString() },
    { label: 'Followers', value: s?.followers == null ? '—' : s.followers.toLocaleString() },
    { label: 'Published this month', value: s ? String(s.publishedThisMonth) : '—' },
    { label: 'Waiting on you', value: s ? String(s.waitingCount) : '—' },
  ];

  const markDone = async (id: string) => {
    try {
      await complete.mutateAsync({ key: `action-${id}`, source: 'Action', step: '', projectId, projectName: '', refId: id, rank: 0 });
      toast.success('Marked done');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save that step');
    }
  };

  return (
    <div className="space-y-6">
      <SetupLine projectId={projectId} onOpen={onOpenSetup} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-primary/25 bg-card p-4">
            <p className="text-4xl sm:text-5xl font-bold leading-none text-foreground tabular-nums break-words">{t.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>

      <Card className="border-primary/40">
        <CardHeader className="pb-2"><CardTitle className="text-base">Waiting on you</CardTitle></CardHeader>
        <CardContent>
          {summary.isLoading ? <Loading /> : summary.isError ? <LoadError onRetry={() => summary.refetch()} /> :
            !s || s.waitingCount === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is waiting on you for this brand.</p>
            ) : (
              <ul className="divide-y divide-border">
                {s.waitingActions.map((a) => (
                  <li key={a.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{a.title}</p>
                      <div className="mt-1 flex gap-1.5 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px]', PRIORITY_CHIP[a.priorityRank])}>
                          {priorityLabel(a.priorityRank) === '—' ? 'No priority' : priorityLabel(a.priorityRank)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">Step</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={complete.isPending} onClick={() => markDone(a.id)}>Done</Button>
                      {a.jobId && (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={pipelineHref(projectId, a.jobId)}>Open</Link>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
                {s.waitingContent.map((c) => (
                  <li key={c.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{c.title}</p>
                      <div className="mt-1 flex gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">Ready to approve</Badge>
                        <Badge variant="secondary" className="text-[10px]">Quality {dash(c.quality_score)}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={approve.isPending}
                        onClick={async () => {
                          try { await approve.mutateAsync(c.id); toast.success('Approved'); summary.refetch(); }
                          catch (e: any) { toast.error(e?.message ?? 'Could not approve it'); }
                        }}
                      >
                        Done
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="?tab=content">Open</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>

      {nextTen}
      {pillars}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Activity</CardTitle></CardHeader>
        <CardContent>
          {activity.isLoading ? <Loading /> : activity.isError ? <LoadError onRetry={() => activity.refetch()} /> :
            (activity.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ol className="space-y-2">
                {activity.data!.map((e) => (
                  <li key={e.key} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-foreground min-w-0">{e.text}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{relativeTime(e.at)}</span>
                  </li>
                ))}
              </ol>
            )}
        </CardContent>
      </Card>

      {setup}
    </div>
  );
}

// ---------------- Channels ----------------
function ChannelsTab({ projectId, isAdmin }: { projectId: string; isAdmin: boolean }) {
  const { data = [], isLoading, isError, refetch } = useBrandChannels(projectId);
  const methods = useKnowledgeRows(data.map((c) => c.destination_method_id));
  const [open, setOpen] = useState<BrandChannel | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [req, setReq] = useState<PipelineRequest | null>(null);
  const [shots, setShots] = useState(false);
  const stats = useChannelStats(data.map((c) => c.id));

  if (isLoading) return <Loading />;
  if (isError) return <LoadError onRetry={() => refetch()} />;

  return (
    <>
      {isAdmin && (
        <div className="mb-3">
          <Button size="sm" variant="outline" onClick={() => setShots(true)}>Update from screenshots</Button>
        </div>
      )}
      <ScreenshotStatsDialog open={shots} onClose={() => setShots(false)} projectId={projectId} channels={data} />
      {!data.length && <p className="text-sm text-muted-foreground">No channels recorded for this brand.</p>}
      <ul className="space-y-2">
        {data.map((c) => {
          const stale = isChannelStale(c);
          const m = c.destination_method_id ? methods.data?.get(c.destination_method_id) : null;
          return (
            <li key={c.id} className="rounded-none border-l-4 border-signal-green bg-card border-y border-r border-border">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpen(c)}
                onKeyDown={(e) => { if (e.key === 'Enter') setOpen(c); }}
                className="p-3 grid gap-2 md:grid-cols-[1.4fr_0.8fr_0.5fr_1fr_0.7fr_0.9fr_0.8fr_1.2fr_auto] md:items-center cursor-pointer hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{platformLabel(c.platform)}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.handle || c.account_label || '—'}</p>
                  {latestLine(stats.data?.get(c.id)?.[0]) && (
                    <p className="text-xs text-foreground">{latestLine(stats.data?.get(c.id)?.[0])}</p>
                  )}
                </div>
                <div className="text-sm">
                  <span className="capitalize">{c.status.replace(/_/g, ' ')}</span>
                  {stale && <span className="ml-1 font-semibold text-destructive">STALE</span>}
                </div>
                <div className="text-sm"><span className="md:hidden text-muted-foreground">Level </span>{dash(c.content_level)}</div>
                <div className="text-sm">
                  <span className="md:hidden text-muted-foreground">Followers </span>
                  {c.followers == null ? '—' : c.followers.toLocaleString()}
                  {c.follower_date && <span className="text-xs text-muted-foreground"> ({c.follower_date})</span>}
                </div>
                <div className="text-sm">{c.cadence_target == null ? '—' : `${Number(c.cadence_target)}/wk`}</div>
                <div className="text-sm"><span className="md:hidden text-muted-foreground">Last post </span>{relativeTime(c.last_post_at)}</div>
                <div className="text-sm capitalize">{dash(c.scheduler)}</div>
                <div className="text-xs text-muted-foreground min-w-0 truncate">{m ? `${m.title}${m.version ? ` v${m.version}` : ''}` : '—'}</div>
                {isAdmin ? (
                  <Button
                    size="sm" variant="ghost" className="justify-self-start"
                    aria-label={`Edit ${platformLabel(c.platform)}`}
                    onClick={(e) => { e.stopPropagation(); setEditing((x) => (x === c.id ? null : c.id)); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : <span />}
              </div>
              {isAdmin && editing === c.id && <ChannelEditor channel={c} onDone={() => setEditing(null)} />}
            </li>
          );
        })}
      </ul>
      <ChannelDrawer channel={open} stats={open ? stats.data?.get(open.id) ?? [] : []} canEdit={isAdmin} method={open?.destination_method_id ? methods.data?.get(open.destination_method_id) ?? null : null} onClose={() => setOpen(null)}
        onSetUp={(c) => { setOpen(null); setReq({ projectId, kind: 'channel_setup', title: `Set up ${platformLabel(c.platform)}`, targetKey: c.id, channelMethodId: c.destination_method_id }); }} />
      <CreatePipelineDialog request={req} onClose={() => setReq(null)} />
    </>
  );
}

function ChannelEditor({ channel, onDone }: { channel: BrandChannel; onDone: () => void }) {
  const update = useUpdateBrandChannel();
  const [draft, setDraft] = useState({
    status: channel.status,
    content_level: channel.content_level == null ? '' : String(channel.content_level),
    cadence_target: channel.cadence_target == null ? '' : String(channel.cadence_target),
    handle: channel.handle ?? '',
    url: channel.url ?? '',
  });
  const save = async () => {
    const cadence = draft.cadence_target.trim() === '' ? null : Number(draft.cadence_target);
    if (cadence != null && (!Number.isFinite(cadence) || cadence < 0)) return toast.error('Cadence must be a number');
    try {
      await update.mutateAsync({
        id: channel.id,
        patch: {
          status: draft.status,
          content_level: draft.content_level ? Number(draft.content_level) : null,
          cadence_target: cadence,
          handle: draft.handle.trim() || null,
          url: draft.url.trim() || null,
        },
      });
      toast.success('Channel saved');
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save the channel');
    }
  };
  return (
    <div className="p-3 pt-0 grid gap-2 sm:grid-cols-2 lg:grid-cols-6 items-end">
      <label className="text-xs space-y-1">Status
        <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{CHANNEL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
        </Select>
      </label>
      <label className="text-xs space-y-1">Level
        <Select value={draft.content_level || 'none'} onValueChange={(v) => setDraft({ ...draft, content_level: v === 'none' ? '' : v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {['1', '2', '3'].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
      <label className="text-xs space-y-1">Posts per week
        <Input className="h-9" inputMode="decimal" value={draft.cadence_target} onChange={(e) => setDraft({ ...draft, cadence_target: e.target.value })} />
      </label>
      <label className="text-xs space-y-1">Handle
        <Input className="h-9" value={draft.handle} onChange={(e) => setDraft({ ...draft, handle: e.target.value })} />
      </label>
      <label className="text-xs space-y-1">URL
        <Input className="h-9" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
      </label>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={update.isPending}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

function ChannelDrawer({ channel, stats, canEdit, method, onClose, onSetUp }: { channel: BrandChannel | null; stats: import('@/hooks/useBrandSetup').ChannelStatRow[]; canEdit: boolean; method: KnowledgeRow | null; onClose: () => void; onSetUp: (c: BrandChannel) => void }) {
  const placements = useQuery({
    queryKey: ['brand-workspace', 'channel-placements', channel?.id],
    enabled: !!channel,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('content_placements')
        .select('id,channel,account_label,status,live_url,verified_at,scheduled_for,created_at')
        .eq('project_id', channel!.project_id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const keys = [channel!.platform, platformLabel(channel!.platform), channel!.account_label]
        .filter(Boolean).map((k) => String(k).toLowerCase());
      return ((data ?? []) as any[])
        .filter((p) => keys.includes(String(p.channel ?? '').toLowerCase()) || keys.includes(String(p.account_label ?? '').toLowerCase()))
        .slice(0, 5);
    },
  });
  return (
    <Sheet open={!!channel} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {channel && (
          <>
            <SheetHeader>
              <SheetTitle>{platformLabel(channel.platform)}</SheetTitle>
              <SheetDescription>{channel.handle || channel.account_label || 'No handle recorded'}</SheetDescription>
            </SheetHeader>
            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {([
                ['Status', channel.status.replace(/_/g, ' ') + (isChannelStale(channel) ? ' · STALE' : '')],
                ['Level', dash(channel.content_level)],
                ['Account', dash(channel.account_label)],
                ['Followers', channel.followers == null ? '—' : `${channel.followers.toLocaleString()}${channel.follower_date ? ` (${channel.follower_date})` : ''}`],
                ['Cadence', channel.cadence_target == null ? '—' : `${Number(channel.cadence_target)} per week`],
                ['Last post', relativeTime(channel.last_post_at)],
                ['Scheduler', dash(channel.scheduler)],
                ['URL', dash(channel.url)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="text-foreground break-words">{v}</dd>
                </div>
              ))}
            </dl>
            {channel.notes && <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{channel.notes}</p>}
            <div className="mt-5">
              <h4 className="text-sm font-semibold">Method</h4>
              {method ? (
                <div className="mt-1 text-sm">
                  <p className="font-medium">{method.title}{method.version ? ` v${method.version}` : ''}</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{method.summary ?? 'No summary yet.'}</p>
                </div>
              ) : <p className="text-sm text-muted-foreground">No governing method set.</p>}
            </div>
            {canEdit ? <StatsHistory channelId={channel.id} rows={stats} /> : (
              <ul className="mt-5 space-y-1 text-sm">{stats.slice(0, 5).map((r) => <li key={r.id}>{latestLine(r)}</li>)}</ul>
            )}
            <div className="mt-5">
              <h4 className="text-sm font-semibold">Recent placements</h4>
              {placements.isLoading ? <Loading /> : (placements.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No placements on this channel yet.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {placements.data!.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <span className="capitalize">{String(p.status).replace(/_/g, ' ')}</span>
                      <span className="text-xs text-muted-foreground">{relativeTime(p.verified_at ?? p.scheduled_for ?? p.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {channel.url && (
              <Button className="mt-6 w-full" asChild>
                <a href={channel.url} target="_blank" rel="noreferrer">Open <ExternalLink className="h-4 w-4 ml-1" /></a>
              </Button>
            )}
            <Button variant="outline" className="mt-3 w-full" onClick={() => onSetUp(channel)}>Set up</Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------- Avenues ----------------
function AvenuesTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { result, isLoading } = useFoundationScores(projectId) as any;
  const items: any[] = (result?.categories ?? []).flatMap((c: any) => c.items);
  if (isLoading) return <Loading />;
  if (!items.length) return <p className="text-sm text-muted-foreground">No Foundation Audit items for this brand yet.</p>;
  const lanes = items.filter((i) => i.item_key.startsWith('lane_'));
  const setupItems = items.filter((i) => !i.item_key.startsWith('lane_'));
  const groups = [
    { title: 'On', rows: lanes.filter((i) => i.status === 'satisfied') },
    { title: 'Not on yet', rows: lanes.filter((i) => i.status === 'missing') },
    { title: 'Unknown', rows: lanes.filter((i) => i.status !== 'satisfied' && i.status !== 'missing') },
  ];
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className="text-sm font-semibold mb-2">{g.title} <span className="text-muted-foreground font-normal">({g.rows.length})</span></h3>
          {g.rows.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {g.rows.map((i) => <LaneCard key={i.item_key} item={i} projectId={projectId} canEdit={canEdit} />)}
            </div>
          )}
        </section>
      ))}
      <section>
        <h3 className="text-sm font-semibold mb-2">Setup</h3>
        <ul className="rounded-2xl border border-gold/40 divide-y divide-border bg-card">
          {setupItems.map((i) => (
            <li key={i.item_key} className="p-3 flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0">{i.label}</span>
              <span className="text-xs text-muted-foreground capitalize shrink-0">{String(i.status).replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function LaneCard({ item, projectId, canEdit }: { item: any; projectId: string; canEdit: boolean }) {
  const upsert = useUpsertFoundationItemStatus();
  const [marking, setMarking] = useState(false);
  const [req, setReq] = useState<PipelineRequest | null>(null);
  const [evidence, setEvidence] = useState('');
  const laneQc = useQueryClient();
  const score = laneScore(item);
  return (
    <div className="rounded-2xl border-2 border-gold/40 bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-foreground">{item.label}</p>
        <Badge variant="outline" className="text-[10px] capitalize shrink-0">{item.severity}</Badge>
      </div>
      <div className="flex gap-4 text-sm">
        <div><p className="text-xl font-bold">{score == null ? '—' : `$${Math.round(score).toLocaleString()}`}</p><p className="text-[11px] text-muted-foreground">per hour</p></div>
        <div><p className="text-xl font-bold">{item.est_dollars_90d == null ? '—' : formatCurrency(Number(item.est_dollars_90d))}</p><p className="text-[11px] text-muted-foreground">est. 90 days</p></div>
      </div>
      {canEdit && <EditCrmRecord title="Estimates" record={item} fields={[
        {key:'est_dollars_90d',label:'Estimated revenue over 90 days ($)',type:'number'},
        {key:'confidence',label:'Confidence (0 to 1)',type:'number'},
        {key:'leverage',label:'Leverage multiplier',type:'number'},
        {key:'est_hours',label:'Estimated hours',type:'number'},
      ]} onSave={async patch => {
        if (patch.confidence != null && patch.confidence > 1) throw new Error('Confidence must be between 0 and 1.');
        if (patch.est_hours != null && patch.est_hours <= 0) throw new Error('Hours must be greater than zero.');
        const {error} = await (supabase as any).from('project_foundation_item_overrides').upsert({
          project_id:projectId,item_key:item.item_key,category_key:item.category_key,label:item.label,
          detection_signal:item.detection_signal,is_manual_only:item.is_manual_only,severity:item.severity,
          ...patch,
        },{onConflict:'project_id,item_key'});
        if(error) throw error;
        await laneQc.invalidateQueries();
      }} />}
      {item.recommended_fix && <p className="text-xs text-muted-foreground">{item.recommended_fix}</p>}
      <p className="text-xs">Status: <span className="capitalize">{String(item.status).replace(/_/g, ' ')}</span></p>
      {canEdit && item.status !== 'satisfied' && (
        marking ? (
          <div className="flex gap-2 flex-wrap">
            <Input className="h-8 flex-1 min-w-[10rem]" placeholder="Evidence URL (optional)" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
            <Button size="sm" className="h-8" disabled={upsert.isPending}
              onClick={() => upsert.mutate(
                { venue_id: projectId, item_key: item.item_key, status: 'satisfied', evidence_url: evidence.trim() || null, notes: item.notes ?? null },
                { onSuccess: () => { toast.success('Marked on'); setMarking(false); }, onError: (e: any) => toast.error(e?.message ?? 'Could not save') },
              )}>Save</Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setMarking(false)}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="h-8" onClick={() => setMarking(true)}>Mark on</Button>
        )
      )}
      {item.status !== 'satisfied' && (
        <Button size="sm" className="h-8 ml-2" onClick={() => setReq({
          projectId, kind: 'lane', title: `Turn on: ${item.label}`, targetKey: item.item_key, laneItemKey: item.item_key,
        })}>Turn this on</Button>
      )}
      <CreatePipelineDialog request={req} onClose={() => setReq(null)} />
    </div>
  );
}

// ---------------- Products ----------------
function ProductsTab({ projectId }: { projectId: string }) {
  const { data = [], isLoading, isError, refetch } = useProjectProducts(projectId);
  const jobs = useProjectJobs(projectId);
  const byProduct = jobByTarget(jobs.data ?? [], 'channel_products');
  const [req, setReq] = useState<PipelineRequest | null>(null);
  if (isLoading) return <Loading />;
  if (isError) return <LoadError onRetry={() => refetch()} />;
  if (!data.length) return <p className="text-sm text-muted-foreground">No products linked to this brand.</p>;
  return (
    <>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((p: any) => (
        <div key={p.id} className="rounded-lg border-t-4 border-orange border-x border-b border-border bg-card p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-foreground">{p.name}</p>
            <Badge variant="secondary" className="text-[10px] capitalize shrink-0">{dash(p.status)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            {p.funnel_stage ? String(p.funnel_stage).replace(/_/g, ' ') : 'No stage'} · {p.price == null ? 'No price' : formatCurrency(Number(p.price))}
            {' · '}{p.monthly_sales == null ? '— sales/mo' : `${Number(p.monthly_sales)} sales/mo`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {p.listings.length === 0 ? <span className="text-xs text-muted-foreground">No listings yet</span> :
              p.listings.map((l: any) => (
                <Badge key={l.id} variant="outline" className="text-[10px]">{l.outlet}: {l.status}</Badge>
              ))}
          </div>
          {byProduct.get(p.id) ? (
            <Button size="sm" variant="outline" asChild>
              <Link to={pipelineHref(projectId, byProduct.get(p.id)!)}>Pipeline</Link>
            </Button>
          ) : (
            <Button size="sm" onClick={() => setReq({
              projectId, kind: 'product', title: p.name, targetType: 'channel_products', targetId: p.id,
              productType: productTypeForName(p.name ?? ''),
              destinations: [...new Set(p.listings.map((l: any) => outletToDestination(l.outlet)).filter(Boolean))] as string[],
            })}>Start production</Button>
          )}
        </div>
      ))}
    </div>
    <CreatePipelineDialog request={req} onClose={() => setReq(null)} onCreated={() => jobs.refetch()} />
    </>
  );
}

// ---------------- Content ----------------
function ContentTab({ projectId }: { projectId: string }) {
  const { data = [], isLoading, isError, refetch } = useProductionBoardItems([projectId]);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  if (isLoading) return <Loading />;
  if (isError) return <LoadError onRetry={() => refetch()} />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Open a post to read or edit its script, attach file links, approve the finished work,
        and record actual scheduling or publication. Changing a label does not schedule a post.
      </p>
      {data.length === 0 ? <p className="text-sm text-muted-foreground">
        No posts yet. Use Content to create one, or turn an audience question into a production plan.
      </p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {data.map(it => (
            <ProductionItemCard
              key={it.id}
              item={it}
              brandName="This brand"
              onOpen={item => setSelectedWork(item.id)}
            />
          ))}
        </div>
      )}
      <ContentWorkflowDialog projectId={projectId} itemId={selectedWork} onClose={() => setSelectedWork(null)} />
    </div>
  );
}

// ---------------- Intel ----------------
function IntelTab({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, refetch } = useBrandIntel(projectId);
  const jobs = useProjectJobs(projectId);
  const byContent = jobByTarget(jobs.data ?? [], 'content_items');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [req, setReq] = useState<PipelineRequest | null>(null);
  if (isLoading) return <Loading />;
  if (isError || !data) return <LoadError onRetry={() => refetch()} />;
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold mb-2">Niche Profile</h3>
        {data.niche.length === 0 ? <p className="text-sm text-muted-foreground">No niche profile yet.</p> :
          data.niche.map((n) => {
            const full = expanded[n.id];
            const text: string = n.summary ?? '';
            return (
              <article key={n.id} className="rounded-xl bg-muted/40 p-4">
                <p className="font-semibold">{n.title}</p>
                <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">{full || text.length <= 400 ? text : `${text.slice(0, 400)}…`}</p>
                {text.length > 400 && (
                  <button className="mt-2 text-sm text-primary underline" onClick={() => setExpanded({ ...expanded, [n.id]: !full })}>
                    {full ? 'Show less' : 'Show full profile'}
                  </button>
                )}
              </article>
            );
          })}
      </section>
      <section>
        <h3 className="text-lg font-semibold mb-2">Top pains</h3>
        {data.pains.length === 0 ? <p className="text-sm text-muted-foreground">No pains recorded yet.</p> : (
          <ol className="space-y-2">
            {data.pains.map((p, i) => (
              <li key={p.id} className="flex flex-wrap items-start gap-3 rounded-md border border-dashed border-border p-3">
                <span className="text-2xl font-bold text-muted-foreground w-6 shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{p.pain_text}</p>
                  <p className="text-xs text-muted-foreground">
                    Score {dash(p.pain_score)} · {dash(p.source_count)} sources{p.product_flag ? ' · ' : ''}
                    {p.product_flag && <span className="font-semibold text-foreground">Product</span>}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={async () => {
                  try { setReq(await contentItemFromPain(projectId, p.pain_text, p.id)); }
                  catch (e: any) { toast.error(e?.message ?? 'Could not create the item'); }
                }}>Make this</Button><PainUsageBadge projectId={projectId} painId={p.id} />
              </li>
            ))}
          </ol>
        )}
      </section>
      <section>
        <h3 className="text-lg font-semibold mb-2">Briefs</h3>
        {data.briefs.length === 0 ? <p className="text-sm text-muted-foreground">No scored ideas yet.</p> : (
          <ul className="space-y-2">
            {data.briefs.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3">
                <span className="text-3xl font-bold tabular-nums w-12 shrink-0">{b.idea_score}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{b.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{dash(b.format)} · {dash(b.purpose_type)}</p>
                </div>
                {byContent.get(b.id) ? (
                  <Button size="sm" variant="outline" asChild><Link to={pipelineHref(projectId, byContent.get(b.id)!)}>Pipeline</Link></Button>
                ) : (
                  <Button size="sm" onClick={() => setReq({
                    projectId, kind: 'content', title: b.title, targetType: 'content_items', targetId: b.id,
                    productType: productTypeForFormat(b.format),
                  })}>Make this</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <CreatePipelineDialog request={req} onClose={() => setReq(null)} onCreated={() => jobs.refetch()} />
      <section>
        <h3 className="text-lg font-semibold mb-2">Dimension library</h3>
        {data.dims.length === 0 ? <p className="text-sm text-muted-foreground">No dimensions filed yet.</p> : (
          <ul className="flex flex-wrap gap-2">
            {data.dims.map((d) => {
              const shelf = dimensionShelf(d.title);
              return (
                <li key={d.id} className="rounded-full border border-border px-3 py-1 text-xs">
                  {shelf && <span className="font-semibold mr-1">{shelf}</span>}
                  {d.title.replace(/^.*?:\s*/, '')}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------- Assets ----------------
function AssetPreview({ path, mime, name }: { path: string; mime: string | null; name: string }) {
  const isImage = (mime ?? '').startsWith('image/');
  const { data: url } = useQuery({ queryKey: ['brand-asset-url', path], enabled: isImage, staleTime: 50 * 60_000, queryFn: () => getSignedUrl(path) });
  if (!isImage) return <div className="aspect-square rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground uppercase">{(mime ?? 'file').split('/').pop()}</div>;
  return url ? <img src={url} alt={name} className="aspect-square w-full rounded object-cover" loading="lazy" /> : <div className="aspect-square rounded bg-muted" />;
}

function DocRow({ d }: { d: KnowledgeRow }) {
  const href = d.attachment_url || d.external_url;
  return (
    <li className="py-2 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{d.title}{d.version ? ` · v${d.version}` : ''}</p>
        <p className="text-xs text-muted-foreground">Review by {dash(d.expiry_date)}{d.status === 'draft' ? ' · planned' : ''}</p>
      </div>
      {href && <a href={href} target="_blank" rel="noreferrer" className="text-sm text-primary underline shrink-0">Open</a>}
    </li>
  );
}

function AssetsTab({ projectId }: { projectId: string }) {
  const kit = useBrandKitAssetsView(projectId);
  const docs = useProjectDocuments(projectId);
  if (kit.isLoading || docs.isLoading) return <Loading />;
  if (kit.isError || docs.isError) return <LoadError onRetry={() => { kit.refetch(); docs.refetch(); }} />;
  const links = (kit.data?.links ?? []) as any[];
  const byCat = new Map<string, any[]>();
  links.forEach((l) => { const k = l.category || 'Other'; byCat.set(k, [...(byCat.get(k) ?? []), l]); });
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold mb-2">Files</h3>
        {!kit.data?.kit ? <p className="text-sm text-muted-foreground">No brand kit yet. <BrandKitLink projectId={projectId} /></p> :
          kit.data.assets.length === 0 ? <p className="text-sm text-muted-foreground">No files in the brand kit yet.</p> : (
            <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {kit.data.assets.map((a: any) => (
                <li key={a.id} className="space-y-1">
                  <AssetPreview path={a.storage_path} mime={a.mime_type} name={a.file_name} />
                  <p className="text-[11px] truncate" title={a.file_name}>{a.file_name}</p>
                </li>
              ))}
            </ul>
          )}
      </section>
      <section>
        <h3 className="text-lg font-semibold mb-2">Links</h3>
        {links.length === 0 ? <p className="text-sm text-muted-foreground">No links saved.</p> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...byCat.entries()].map(([cat, rows]) => (
              <div key={cat} className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{cat}</p>
                <ul className="space-y-1">
                  {rows.map((l) => <li key={l.id}><a href={l.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline break-all">{l.label || l.url}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <h3 className="text-lg font-semibold mb-2">Documents</h3>
        {(docs.data?.own ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No brand documents yet.</p> :
          <ul className="divide-y divide-border">{docs.data!.own.map((d) => <DocRow key={d.id} d={d} />)}</ul>}
      </section>
      <section>
        <h3 className="text-lg font-semibold mb-2">Shared plans</h3>
        {(docs.data?.shared ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No shared plans.</p> :
          <ul className="divide-y divide-border">{docs.data!.shared.map((d) => <DocRow key={d.id} d={d} />)}</ul>}
      </section>
    </div>
  );
}
