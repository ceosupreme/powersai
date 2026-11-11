import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  BRAND_PROFILES, SETUP_SCORE_NOTE, STATE_WORDS, isFoundation, buildSetupBrief, byPriority, channelStatusWord, groupRows, minutesText,
  profileLabel, topMissing, totalMinutes, whyLine, type AssetMapRow,
} from '@/lib/brandSetup';
import { platformLabel, pipelineHref } from '@/lib/ownerWork';
import {
  clearDecision, recordExisting, saveBrandProfile, setDecision, startSetup, useAssetMap, useBrandProfile,
  useOpenSetupJobs, usePlaybookIds, useSetupRefresh, useSetupSummary,
} from '@/hooks/useBrandSetup';
import { BrandKitLink, useOpenBrandKit } from './BrandKitLink';

const T = (t: string) => (supabase as any).from(t);

export function SetupLine({ projectId, onOpen }: { projectId: string; onOpen: () => void }) {
  const s = useSetupSummary(projectId).data;
  if (!s || !s.needed_count) return null;
  return (
    <p className="text-sm text-foreground">
      Setup: {s.in_place} of {s.needed_count} in place, {s.gaps} to set up.{' '}
      <button type="button" className="underline text-primary" onClick={onOpen}>Open Setup</button>
    </p>
  );
}

export function SetupTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const map = useAssetMap(projectId);
  const summary = useSetupSummary(projectId);
  const profile = useBrandProfile(projectId);
  const jobs = useOpenSetupJobs(projectId);
  const rows = map.data ?? [];
  const playbooks = usePlaybookIds(rows.map((r) => r.playbook_key ?? ''));
  const refresh = useSetupRefresh(projectId);
  const navigate = useNavigate();
  const openBrandKit = useOpenBrandKit(projectId);
  const [busy, setBusy] = useState<string | null>(null);
  const [haveIt, setHaveIt] = useState<AssetMapRow | null>(null);
  const [skip, setSkip] = useState<AssetMapRow | null>(null);
  const [top3Open, setTop3Open] = useState(false);
  const [editProfile, setEditProfile] = useState(false);

  const openJobs = jobs.data ?? new Map<string, string>();
  const by = (st: string) => rows.filter((r) => r.state === st).sort(byPriority);
  const top = useMemo(() => topMissing(rows, new Set(openJobs.keys())), [rows, openJobs]);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); await refresh(); }
    catch (e: any) { toast.error(e?.message ?? 'That did not save'); }
    finally { setBusy(null); }
  };

  const setUp = (r: AssetMapRow) => run(`setup-${r.asset_key}`, async () => {
    const jobId = await startSetup(projectId, r);
    toast.success(`Setup plan created for ${r.label}`);
    navigate(pipelineHref(projectId, jobId));
  });

  const copyBrief = async () => {
    try {
      const [{ data: venue }, { data: kit }] = await Promise.all([
        T('venues').select('name,niche').eq('id', projectId).maybeSingle(),
        T('brand_kits').select('id,primary_font,secondary_font,brand_voice').eq('project_id', projectId).eq('archived', false).limit(1).maybeSingle(),
      ]);
      let colors: string[] = [];
      if (kit?.id) {
        const c = await T('brand_kit_colors').select('hex,label').eq('kit_id', kit.id).order('sort_order');
        colors = ((c.data ?? []) as any[]).map((x) => (x.label ? `${x.label} ${x.hex}` : x.hex));
      }
      const gaps = rows.filter((r) => ['missing', 'planned', 'needs_access'].includes(r.state)).sort(byPriority);
      const text = buildSetupBrief({
        brand: venue?.name ?? rows[0]?.brand ?? 'This brand',
        niche: venue?.niche ?? null,
        kit: kit ? { colors, fonts: [kit.primary_font, kit.secondary_font].filter(Boolean), voice: kit.brand_voice } : null,
        inUse: rows.filter((r) => r.state === 'on_file').map((r) => ({ label: r.label, handle: r.handle, url: r.url })),
        gaps,
        playbookIdByKey: playbooks.data ?? new Map(),
      });
      await navigator.clipboard.writeText(text);
      toast.success('Setup brief copied');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not copy the brief');
    }
  };

  if (map.isLoading) return <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (map.isError) return <p className="text-sm text-destructive">The setup map could not be loaded. <button className="underline" onClick={() => map.refetch()}>Try again</button></p>;

  const s = summary.data;
  const playbookLink = (r: AssetMapRow) => {
    const id = r.playbook_key ? playbooks.data?.get(r.playbook_key) : undefined;
    return id ? <Link to={`/playbooks?open=${id}`} className="text-xs underline text-primary">Playbook</Link> : null;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Setup: {s?.in_place ?? 0} of {s?.needed_count ?? 0} in place, {s?.gaps ?? 0} to set up
        </h2>
        {s?.setup_score != null && (
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">Setup score {s.setup_score}, {s.setup_gate ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{SETUP_SCORE_NOTE}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Brand type:</span>
          {(profile.data ?? []).length ? (profile.data ?? []).map((p) => <Badge key={p} variant="secondary">{profileLabel(p)}</Badge>)
            : <span className="text-muted-foreground">Not set</span>}
          {canEdit && <Button size="sm" variant="ghost" onClick={() => setEditProfile(true)}>Edit</Button>}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!top.length} onClick={() => setTop3Open(true)}>Set up the top 3</Button>
            <Button size="sm" variant="outline" onClick={copyBrief}>Copy instructions for an assistant</Button>
          </div>
        )}
      </header>

      <Section title="To set up" count={by('missing').length}>
        {groupRows(by('missing')).map((g) => (
          <Group key={g.grp} title={g.grp}>
            {g.rows.map((r) => (
              <Row key={r.asset_key} title={r.label} badge={STATE_WORDS.missing}>
                {whyLine(r) && <p className="text-xs text-muted-foreground">Why: {whyLine(r)}</p>}
                {r.unlocks && <p className="text-sm text-foreground">{r.unlocks}</p>}
                <p className="text-xs text-muted-foreground">{minutesText(r.setup_minutes)} {playbookLink(r)}</p>
                {canEdit && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {isFoundation(r) ? (
                      <Button size="sm" onClick={openBrandKit}>Open your brand kit</Button>
                    ) : r.channel_id && openJobs.get(r.channel_id) ? (
                      <Button size="sm" variant="outline" asChild><Link to={pipelineHref(projectId, openJobs.get(r.channel_id)!)}>Resume setup plan</Link></Button>
                    ) : (
                      <Button size="sm" disabled={busy === `setup-${r.asset_key}`} onClick={() => setUp(r)}>Make setup plan & open first step</Button>
                    )}
                    {!isFoundation(r) && <Button size="sm" variant="outline" onClick={() => setHaveIt(r)}>I already have it</Button>}
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run(`later-${r.asset_key}`, () => setDecision(projectId, r.asset_key, 'later'), `${r.label} moved to Later`)}>Later</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSkip(r)}>Skip</Button>
                  </div>
                )}
              </Row>
            ))}
          </Group>
        ))}
      </Section>

      <Section title="Needs attention" count={by('needs_access').length + by('planned').length}>
        {[...by('needs_access'), ...by('planned')].map((r) => {
          const job = r.channel_id ? openJobs.get(r.channel_id) : undefined;
          return (
            <Row key={r.asset_key} title={r.label} badge={STATE_WORDS[r.state]} sub={r.grp}>
              {r.handle && <p className="text-xs text-muted-foreground">{r.handle}</p>}
              {canEdit && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {isFoundation(r) ? <Button size="sm" onClick={openBrandKit}>Open your brand kit</Button>
                    : job ? <Button size="sm" variant="outline" asChild><Link to={pipelineHref(projectId, job)}>Resume setup plan</Link></Button>
                    : <Button size="sm" disabled={busy === `setup-${r.asset_key}`} onClick={() => setUp(r)}>Make setup plan & open first step</Button>}
                  {r.state === 'planned' && !isFoundation(r) && <Button size="sm" variant="outline" onClick={() => setHaveIt(r)}>I already have it</Button>}
                </div>
              )}
            </Row>
          );
        })}
      </Section>

      <Section title="In place" count={by('on_file').length}>
        {groupRows(by('on_file')).map((g) => (
          <Group key={g.grp} title={g.grp}>
            {g.rows.map((r) => (
              <Row key={r.asset_key} title={r.label} badge={isFoundation(r) ? STATE_WORDS.on_file : channelStatusWord(r.channel_status)}>
                {isFoundation(r) ? (
                  <p className="text-sm text-foreground">On the Brand kit page. <BrandKitLink projectId={projectId} /></p>
                ) : (<>
                <p className="text-sm text-foreground break-words">
                  {r.handle || (r.channel_platform ? platformLabel(r.channel_platform) : '—')}
                  {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center text-xs underline text-primary">Open <ExternalLink className="ml-0.5 h-3 w-3" /></a>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.followers == null ? 'No follower count yet' : `${r.followers.toLocaleString()} followers${r.follower_date ? ` on ${r.follower_date}` : ''}`}
                </p>
                </>)}
              </Row>
            ))}
          </Group>
        ))}
      </Section>

      <Folded title="Later and Skipped" count={by('later').length + by('skipped').length}>
        {[...by('later'), ...by('skipped')].map((r) => (
          <Row key={r.asset_key} title={r.label} badge={STATE_WORDS[r.state]} sub={r.grp}>
            {r.decision_reason && <p className="text-xs text-muted-foreground">Reason: {r.decision_reason}</p>}
            {canEdit && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(`undo-${r.asset_key}`, () => clearDecision(projectId, r.asset_key), 'Decision undone')}>Undo</Button>}
          </Row>
        ))}
      </Folded>

      <Folded title="More options" count={by('optional').length}>
        {groupRows(by('optional')).map((g) => (
          <Group key={g.grp} title={g.grp}>
            {g.rows.map((r) => (
              <Row key={r.asset_key} title={r.label} badge={STATE_WORDS.optional}>
                {r.unlocks && <p className="text-sm text-foreground">{r.unlocks}</p>}
                {canEdit && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(`add-${r.asset_key}`, () => setDecision(projectId, r.asset_key, 'needed'), `${r.label} added to the plan`)}>Add to this brand's plan</Button>}
              </Row>
            ))}
          </Group>
        ))}
      </Folded>

      <HaveItDialog row={haveIt} onClose={() => setHaveIt(null)}
        onSave={(v) => run('have', () => recordExisting(projectId, haveIt!, v), `${haveIt!.label} recorded`).then(() => setHaveIt(null))} />
      <SkipDialog row={skip} onClose={() => setSkip(null)}
        onSave={(reason) => run('skip', () => setDecision(projectId, skip!.asset_key, 'skip', reason), `${skip!.label} skipped`).then(() => setSkip(null))} />
      <ProfileDialog open={editProfile} value={profile.data ?? []} onClose={() => setEditProfile(false)}
        onSave={(v) => run('profile', () => saveBrandProfile(projectId, v), 'Brand type saved').then(() => setEditProfile(false))} />

      <Dialog open={top3Open} onOpenChange={(o) => !o && setTop3Open(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set up the top 3</DialogTitle>
            <DialogDescription>About {totalMinutes(top)} minutes of your time in total.</DialogDescription>
          </DialogHeader>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            {top.map((r) => <li key={r.asset_key}>{r.label} <span className="text-muted-foreground">· {minutesText(r.setup_minutes)}</span></li>)}
          </ol>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTop3Open(false)}>Cancel</Button>
            <Button disabled={!!busy} onClick={() => run('top3', async () => {
              const created: string[] = [];
              for (const r of top) created.push(await startSetup(projectId, r));
              if (created.length > 0) {
                toast.success(`${created.length} setup plans created. Opening the first plan.`);
                navigate(pipelineHref(projectId, created[0]));
              }
            }).then(() => setTop3Open(false))}>Create plans & open first step</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title} <span className="font-normal text-muted-foreground">({count})</span></h3>
      {count === 0 ? <p className="text-xs text-muted-foreground">None.</p> : children}
    </section>
  );
}
function Folded({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-sm font-semibold">
        <ChevronDown className="h-4 w-4" /> {title} <span className="font-normal text-muted-foreground">({count})</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2">{count === 0 ? <p className="text-xs text-muted-foreground">None.</p> : children}</CollapsibleContent>
    </Collapsible>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h4>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
function Row({ title, badge, sub, children }: { title: string; badge: string; sub?: string; children: React.ReactNode }) {
  return (
    <li className="rounded-lg border border-border bg-card p-3 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-foreground">{title}</p>
        <Badge variant="outline" className="text-[10px]">{badge}</Badge>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      {children}
    </li>
  );
}

function HaveItDialog({ row, onClose, onSave }: { row: AssetMapRow | null; onClose: () => void; onSave: (v: { platform: string; handle: string; url: string; followers: number | null; status: 'live' | 'dormant' }) => void }) {
  const [v, setV] = useState({ platform: '', handle: '', url: '', followers: '', status: 'live' as 'live' | 'dormant' });
  const platforms = row?.platforms ?? [];
  const open = !!row;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (row && lastKey !== row.asset_key) {
    setLastKey(row.asset_key);
    setV({ platform: row.channel_platform ?? platforms[0] ?? row.asset_key, handle: row.handle ?? '', url: row.url ?? '', followers: '', status: 'live' });
  }
  const followers = v.followers.trim() === '' ? null : Number(v.followers.replace(/,/g, ''));
  const bad = followers != null && (!Number.isFinite(followers) || followers < 0);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>I already have {row?.label}</DialogTitle><DialogDescription>Record the account so the map counts it.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {platforms.length > 1 && (
            <div className="space-y-1"><Label>Platform</Label>
              <Select value={v.platform} onValueChange={(p) => setV({ ...v, platform: p })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{platforms.map((p) => <SelectItem key={p} value={p}>{platformLabel(p)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1"><Label htmlFor="hi-handle">Handle</Label><Input id="hi-handle" value={v.handle} onChange={(e) => setV({ ...v, handle: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="hi-url">Link</Label><Input id="hi-url" type="url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="hi-f">Followers (optional)</Label><Input id="hi-f" inputMode="numeric" value={v.followers} onChange={(e) => setV({ ...v, followers: e.target.value })} />
            {bad && <p className="text-xs text-destructive">Followers must be a whole number.</p>}</div>
          <div className="space-y-1"><Label>Status</Label>
            <Select value={v.status} onValueChange={(s) => setV({ ...v, status: s as 'live' | 'dormant' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="live">Live</SelectItem><SelectItem value="dormant">Dormant</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={bad || (!v.handle.trim() && !v.url.trim())} onClick={() => onSave({ ...v, handle: v.handle.trim(), url: v.url.trim(), followers })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SkipDialog({ row, onClose, onSave }: { row: AssetMapRow | null; onClose: () => void; onSave: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) { setReason(''); onClose(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Skip {row?.label}</DialogTitle><DialogDescription>Say why, so the reason stays with the brand.</DialogDescription></DialogHeader>
        <Label htmlFor="skip-reason">Reason</Label>
        <Textarea id="skip-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!reason.trim()} onClick={() => { onSave(reason.trim()); setReason(''); }}>Skip it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileDialog({ open, value, onClose, onSave }: { open: boolean; value: string[]; onClose: () => void; onSave: (v: string[]) => void }) {
  const [sel, setSel] = useState<string[]>(value);
  const [was, setWas] = useState(false);
  if (open !== was) { setWas(open); if (open) setSel(value); }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Brand type</DialogTitle><DialogDescription>Pick every kind that fits. The map updates from this.</DialogDescription></DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {BRAND_PROFILES.map((p) => (
            <label key={p.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={sel.includes(p.value)} onCheckedChange={(c) => setSel(c ? [...sel, p.value] : sel.filter((x) => x !== p.value))} />
              {p.label}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(sel)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
