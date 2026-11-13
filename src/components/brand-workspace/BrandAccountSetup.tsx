import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  clearDecision, recordExisting, saveBrandProfile, setDecision, startSetup,
  useAssetMap, useBrandProfile, useOpenSetupJobs, usePlaybookIds, useSetupRefresh,
} from '@/hooks/useBrandSetup';
import {
  buildSetupBrief, byPriority, isFoundation, minutesText, whyLine,
  type AssetMapRow,
} from '@/lib/brandSetup';
import { pipelineHref } from '@/lib/ownerWork';
import { HaveItDialog, ProfileDialog, SkipDialog } from './SetupTab';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

/**
 * Guided brand-only setup. A manager can start/resume a real plan, confirm an
 * existing account, defer or skip an asset and edit the profile of their
 * assigned brand. All writes remain scoped by database RLS.
 */
export function BrandAccountSetup({ projectId, readOnly = false }: { projectId: string; readOnly?: boolean }) {
  const map = useAssetMap(projectId);
  const jobs = useOpenSetupJobs(projectId);
  const profile = useBrandProfile(projectId);
  const playbooks = usePlaybookIds((map.data ?? []).map(r => r.playbook_key ?? ''));
  const refresh = useSetupRefresh(projectId);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [haveIt, setHaveIt] = useState<AssetMapRow | null>(null);
  const [skip, setSkip] = useState<AssetMapRow | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  const rows = map.data ?? [];
  const needed = useMemo(() => (map.data ?? [])
    .filter(r => r.needed && !['on_file', 'skipped', 'later'].includes(r.state))
    .sort(byPriority), [map.data]);
  const ready = needed.filter(r => !isFoundation(r));
  const deferred = rows.filter(r => r.state === 'skipped' || r.state === 'later');
  const running = ready.filter(r => r.channel_id && jobs.data?.has(r.channel_id));
  const shown = all ? ready : ready.slice(0, 5);
  const unstarted = ready.filter(r => !r.channel_id || !jobs.data?.has(r.channel_id)).slice(0, 3);

  const perform = async (key: string, fn: () => Promise<unknown>, ok: string): Promise<boolean> => {
    if (readOnly) return false;
    if (busyKey) return false;
    setBusyKey(key);
    try {
      await fn();
      await refresh();
      toast.success(ok);
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save that setup choice.');
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const begin = async (row: AssetMapRow) => {
    if (readOnly) return;
    if (busyKey) return;
    const existing = row.channel_id && jobs.data?.get(row.channel_id);
    if (existing) { navigate(pipelineHref(projectId, existing)); return; }
    setBusyKey(row.asset_key);
    try {
      const jobId = await startSetup(projectId, row);
      await refresh();
      toast.success('Setup plan saved. Opening its first step.');
      navigate(pipelineHref(projectId, jobId));
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not start setup for this account.');
    } finally { setBusyKey(null); }
  };

  const beginTopThree = async () => {
    if (readOnly) return;
    if (busyKey || !unstarted.length) return;
    setBusyKey('top-three');
    const created: string[] = [];
    let failed = false;
    for (const row of unstarted) {
      try { created.push(await startSetup(projectId, row)); }
      catch (e: any) {
        toast.error(e?.message ?? `Could not start setup for ${row.label}.`);
        failed = true;
        break;
      }
    }
    try {
      await refresh();
      if (created.length > 0) {
        toast.success(`${created.length} setup plan${created.length === 1 ? '' : 's'} saved. Opening the first.`);
        navigate(pipelineHref(projectId, created[0]));
      } else if (!failed) toast.error('No setup plans were created.');
    } catch (e: any) { toast.error(e?.message ?? 'The setup list could not refresh.'); }
    finally { setBusyKey(null); }
  };

  const copyBrief = async () => {
    if (busyKey) return;
    setBusyKey('brief');
    try {
      const [{ data: venue, error: venueError }, { data: kit, error: kitError }] = await Promise.all([
        (supabase as any).from('venues').select('name,niche').eq('id', projectId).maybeSingle(),
        (supabase as any).from('brand_kits').select('id,primary_font,secondary_font,brand_voice')
          .eq('project_id', projectId).eq('archived', false).limit(1).maybeSingle(),
      ]);
      if (venueError || kitError) throw venueError ?? kitError;
      let colors: string[] = [];
      if (kit?.id) {
        const { data, error } = await (supabase as any).from('brand_kit_colors')
          .select('hex,label').eq('kit_id', kit.id).order('sort_order');
        if (error) throw error;
        colors = (data ?? []).map((c: any) => c.label ? `${c.label} ${c.hex}` : c.hex);
      }
      const gaps = rows.filter(r => ['missing', 'planned', 'needs_access'].includes(r.state)).sort(byPriority);
      const brief = buildSetupBrief({
        brand: venue?.name ?? rows[0]?.brand ?? 'This brand',
        niche: venue?.niche ?? null,
        kit: kit ? { colors, fonts: [kit.primary_font, kit.secondary_font].filter(Boolean), voice: kit.brand_voice } : null,
        inUse: rows.filter(r => r.state === 'on_file').map(r => ({ label: r.label, handle: r.handle, url: r.url })),
        gaps,
        playbookIdByKey: playbooks.data ?? new Map(),
      });
      await navigator.clipboard.writeText(brief);
      toast.success('Setup brief copied for an assistant.');
    } catch (e: any) { toast.error(e?.message ?? 'Could not copy the setup brief.'); }
    finally { setBusyKey(null); }
  };

  return <Card><CardContent className="p-4">
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full text-left flex items-center justify-between gap-3">
        <span className="flex gap-2 items-start">
          <Settings2 className="h-5 w-5 text-primary shrink-0"/>
          <span>
            <strong className="block">Accounts and profiles to set up</strong>
            <span className="block text-xs text-muted-foreground">
              Find what's missing, begin the next setup step, or record an account that already exists.
            </span>
          </span>
        </span>
        <ChevronDown className={'h-4 w-4 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')}/>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-3">
        {map.isLoading || jobs.isLoading ? <p className="text-sm text-muted-foreground">Loading your setup checklist…</p> :
        map.isError || jobs.isError ? <div className="space-y-2">
          <p role="alert" className="text-sm text-destructive">Setup information is unavailable.</p>
          <Button size="sm" variant="outline" onClick={() => { void map.refetch(); void jobs.refetch(); }}>Try again</Button>
        </div> : <>
          <p className="text-sm text-muted-foreground">
            {ready.length} accounts need attention. {running.length} already have setup plans in progress.
          </p>
          {!readOnly && rows.some(isFoundation) && <p className="text-xs text-muted-foreground">
            Need your logo, brand colors or fonts? <Link className="text-primary underline"
              to={`/workspace?view=files&brand=${projectId}`}>Find your brand files</Link>.
            Ask the HQ administrator to add anything missing.
          </p>}
          {!readOnly && unstarted.length > 1 && <Button size="sm" variant="outline" disabled={busyKey !== null}
            onClick={beginTopThree}>Make setup plans for the top {unstarted.length}</Button>}
          {!ready.length ? <p className="text-sm text-muted-foreground">
            No required accounts need setup right now. Deferred accounts remain listed below.
          </p> : <div className="space-y-2">
            {shown.map(row => {
              const existing = row.channel_id ? jobs.data?.get(row.channel_id) : undefined;
              return <div key={row.asset_key} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{row.label}</p>
                  <span className="text-xs text-muted-foreground capitalize">{row.state.replace(/_/g, ' ')}</span>
                </div>
                {whyLine(row) && <p className="text-sm text-muted-foreground">{whyLine(row)}</p>}
                {row.unlocks && <p className="text-sm">When ready: {row.unlocks}</p>}
                <p className="text-xs text-muted-foreground">{minutesText(row.setup_minutes)}</p>
                {!readOnly && <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busyKey !== null} onClick={() => begin(row)}>
                    {existing ? 'Resume setup plan' : 'Make setup plan and open first step'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyKey !== null}
                    onClick={() => setHaveIt(row)}>I already have it</Button>
                  <Button size="sm" variant="ghost" disabled={busyKey !== null}
                    onClick={() => void perform('later-'+row.asset_key,
                      () => setDecision(projectId, row.asset_key, 'later'),
                      `${row.label} moved to Later`)}>Later</Button>
                  <Button size="sm" variant="ghost" disabled={busyKey !== null}
                    onClick={() => setSkip(row)}>Skip</Button>
                </div>}
              </div>;
            })}
          </div>}
          {ready.length > 5 && <Button size="sm" variant="ghost" onClick={() => setAll(v => !v)}>
            {all ? 'Show highest priorities' : 'Show all ' + ready.length + ' setup items'}
          </Button>}
          {deferred.length > 0 && <Collapsible>
            <CollapsibleTrigger className="inline-flex items-center gap-2 text-sm font-medium">
              <ChevronDown className="h-4 w-4"/>Later and skipped ({deferred.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {deferred.map(row => <div key={row.asset_key}
                className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.state.replace(/_/g, ' ')}
                    {row.decision_reason ? ' · ' + row.decision_reason : ''}
                  </p>
                </div>
                {!readOnly && <Button size="sm" variant="outline" disabled={busyKey !== null}
                  onClick={() => void perform('undo-'+row.asset_key,
                    () => clearDecision(projectId, row.asset_key), 'Setup choice restored')}>Undo</Button>}
              </div>)}
            </CollapsibleContent>
          </Collapsible>}
          {!readOnly && <Collapsible open={advanced} onOpenChange={setAdvanced}>
            <CollapsibleTrigger className="inline-flex items-center gap-2 text-sm font-medium">
              <ChevronDown className={'h-4 w-4 transition-transform ' + (advanced ? 'rotate-180' : '')}/>
              More setup options
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Update the type of brand this is, or copy its setup instructions for an assistant.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={busyKey !== null}
                  onClick={() => setEditingProfile(true)}>Edit brand type</Button>
                <Button variant="outline" size="sm" disabled={busyKey !== null}
                  onClick={copyBrief}>Copy a setup brief for an assistant</Button>
              </div>
            </CollapsibleContent>
          </Collapsible>}
        </>}
      </CollapsibleContent>
    </Collapsible>

    {!readOnly && <><HaveItDialog row={haveIt} onClose={() => { if (!busyKey) setHaveIt(null); }}
      onSave={(v) => { if (!haveIt) return; void perform('existing',
        () => recordExisting(projectId, haveIt, v), 'Existing account saved')
        .then(saved => { if (saved) setHaveIt(null); }); }} />
    <SkipDialog row={skip} onClose={() => { if (!busyKey) setSkip(null); }}
      onSave={(reason) => { if (!skip) return; void perform('skip',
        () => setDecision(projectId, skip.asset_key, 'skip', reason), 'Setup item skipped')
        .then(saved => { if (saved) setSkip(null); }); }} />
    <ProfileDialog open={editingProfile} value={profile.data ?? []}
      onClose={() => { if (!busyKey) setEditingProfile(false); }}
      onSave={(v) => { void perform('profile',
        () => saveBrandProfile(projectId, v), 'Brand type saved')
         .then(saved => { if (saved) setEditingProfile(false); }); }} /></>}
  </CardContent></Card>;
}
