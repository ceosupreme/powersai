import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { defaultMatch, sourceWord } from '@/lib/brandSetup';
import { platformLabel } from '@/lib/ownerWork';
import { insertStats, useSetupRefresh, type ChannelStatRow } from '@/hooks/useBrandSetup';
import type { BrandChannel } from '@/hooks/useBrandWorkspace';

const T = (t: string) => (supabase as any).from(t);
const n = (v: number | null | undefined) => (v == null ? null : v.toLocaleString());

export function latestLine(s: ChannelStatRow | undefined): string | null {
  if (!s) return null;
  const parts = [
    s.followers != null && `${n(s.followers)} followers`,
    s.following != null && `${n(s.following)} following`,
    s.posts != null ? `${n(s.posts)} posts` : s.videos != null && `${n(s.videos)} videos`,
  ].filter(Boolean);
  if (!parts.length) return null;
  return `${parts.join(' · ')} — ${s.captured_on}, ${sourceWord(s.source)}`;
}

export function StatsHistory({ channelId, rows }: { channelId: string; rows: ChannelStatRow[] }) {
  const refresh = useSetupRefresh('');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const [v, setV] = useState({ followers: '', following: '', posts: '', videos: '', date: today });
  const [saving, setSaving] = useState(false);
  const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(/,/g, '')));
  const vals = { followers: num(v.followers), following: num(v.following), posts: num(v.posts), videos: num(v.videos) };
  const bad = Object.values(vals).some((x) => x != null && (!Number.isFinite(x) || x < 0));
  const empty = Object.values(vals).every((x) => x == null);
  const save = async () => {
    setSaving(true);
    try {
      await insertStats({ channel_id: channelId, source: 'manual', captured_on: v.date, ...vals });
      toast.success('Numbers saved');
      setV({ followers: '', following: '', posts: '', videos: '', date: today });
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? 'Could not save the numbers'); }
    finally { setSaving(false); }
  };
  return (
    <div className="mt-5 space-y-3">
      <h4 className="text-sm font-semibold">Numbers</h4>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No numbers recorded yet.</p> : (
        <ul className="space-y-1 text-sm">
          {rows.slice(0, 5).map((r) => <li key={r.id}>{latestLine(r) ?? `${r.captured_on}, ${sourceWord(r.source)}`}</li>)}
        </ul>
      )}
      <div className="rounded-md border border-border p-3 space-y-2">
        <p className="text-sm font-medium">Add numbers</p>
        <div className="grid grid-cols-2 gap-2">
          {(['followers', 'following', 'posts', 'videos'] as const).map((k) => (
            <label key={k} className="text-xs space-y-1 capitalize">{k}
              <Input className="h-9" inputMode="numeric" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
            </label>
          ))}
          <label className="text-xs space-y-1 col-span-2">Date
            <Input className="h-9" type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
          </label>
        </div>
        {bad && <p className="text-xs text-destructive">Numbers must be whole and not negative.</p>}
        <Button size="sm" disabled={saving || bad || empty || !v.date} onClick={save}>Save numbers</Button>
      </div>
    </div>
  );
}

interface Detected {
  platform: string; handle: string | null; display_name: string | null;
  followers: number | null; following: number | null; posts: number | null; videos: number | null; views: number | null; likes: number | null;
  file: string; match: string;
}

async function resizeToJpeg(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', 0.85);
}

const NUMS = ['followers', 'following', 'posts', 'videos'] as const;

export function ScreenshotStatsDialog({ open, onClose, projectId, channels }: { open: boolean; onClose: () => void; projectId: string; channels: BrandChannel[] }) {
  const refresh = useSetupRefresh(projectId);
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [reading, setReading] = useState(false);
  const [rows, setRows] = useState<Detected[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => { files.forEach((f) => URL.revokeObjectURL(f.url)); setFiles([]); setRows(null); setErrors([]); };
  const close = () => { reset(); onClose(); };

  const read = async () => {
    setReading(true); setErrors([]);
    const out: Detected[] = []; const errs: string[] = [];
    for (const { file } of files) {
      try {
        const image = await resizeToJpeg(file);
        const { data, error } = await supabase.functions.invoke('read-channel-screenshot', { body: { image } });
        if (error) {
          let msg = error.message;
          try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* keep */ }
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);
        for (const a of data?.accounts ?? []) out.push({ ...a, file: file.name, match: defaultMatch(a, channels) });
      } catch (e: any) {
        errs.push(`${file.name}: ${e?.message ?? 'could not be read'}`);
        if (/credits|Too many/i.test(e?.message ?? '')) break;
      }
    }
    setRows(out); setErrors(errs); setReading(false);
  };

  const save = async () => {
    if (!rows) return;
    setSaving(true);
    try {
      for (const r of rows) {
        if (r.match === 'ignore') continue;
        let channelId = r.match;
        if (r.match === 'new') {
          const { data, error } = await T('brand_channels').insert({
            project_id: projectId, platform: r.platform, handle: r.handle, status: 'live',
            account_label: r.display_name, content_level: 1, notes: 'Added from a screenshot',
          }).select('id').single();
          if (error) throw error;
          channelId = data.id;
        } else {
          const ch = channels.find((c) => c.id === r.match);
          const patch: Record<string, string> = {};
          if (ch && !ch.handle && r.handle) patch.handle = r.handle;
          if (Object.keys(patch).length) {
            const { error } = await T('brand_channels').update(patch).eq('id', r.match);
            if (error) throw error;
          }
        }
        await insertStats({ channel_id: channelId, source: 'screenshot', source_ref: r.file, followers: r.followers, following: r.following, posts: r.posts, videos: r.videos, views: r.views, likes: r.likes });
      }
      toast.success('Numbers saved');
      await refresh();
      close();
    } catch (e: any) { toast.error(e?.message ?? 'Could not save the numbers'); }
    finally { setSaving(false); }
  };

  const upd = (i: number, patch: Partial<Detected>) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update from screenshots</DialogTitle>
          <DialogDescription>Pick profile screenshots. They are read once and not stored.</DialogDescription>
        </DialogHeader>
        {!rows ? (
          <div className="space-y-3">
            <Label htmlFor="shots">Screenshots</Label>
            <Input id="shots" type="file" accept="image/*" multiple onChange={(e) => {
              files.forEach((f) => URL.revokeObjectURL(f.url));
              setFiles([...(e.target.files ?? [])].map((file) => ({ file, url: URL.createObjectURL(file) })));
            }} />
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f) => <img key={f.url} src={f.url} alt={f.file.name} className="h-20 w-20 rounded object-cover border border-border" />)}
              </div>
            )}
            {errors.map((e) => <p key={e} className="text-xs text-destructive">{e}</p>)}
            <DialogFooter>
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button disabled={!files.length || reading} onClick={read}>{reading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Read them</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map((e) => <p key={e} className="text-xs text-destructive">{e}</p>)}
            {rows.length === 0 ? <p className="text-sm text-muted-foreground">No accounts were found in these images.</p> : (
              <ul className="space-y-3">
                {rows.map((r, i) => {
                  const same = channels.filter((c) => c.platform === r.platform);
                  return (
                    <li key={i} className="rounded-md border border-border p-3 space-y-2">
                      <p className="text-sm font-medium">{platformLabel(r.platform)} · {r.handle || r.display_name || 'No handle seen'}</p>
                      <p className="text-xs text-muted-foreground">From {r.file}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {NUMS.map((k) => (
                          <label key={k} className="text-xs space-y-1 capitalize">{k}
                            <Input className="h-9" inputMode="numeric" value={r[k] ?? ''} onChange={(e) => {
                              const t = e.target.value.replace(/,/g, '').trim();
                              upd(i, { [k]: t === '' ? null : Number.isFinite(Number(t)) ? Number(t) : r[k] } as Partial<Detected>);
                            }} />
                          </label>
                        ))}
                      </div>
                      <label className="text-xs space-y-1 block">Match to
                        <Select value={r.match} onValueChange={(m) => upd(i, { match: m })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {same.map((c) => <SelectItem key={c.id} value={c.id}>{platformLabel(c.platform)} · {c.handle || c.account_label || 'no handle'}</SelectItem>)}
                            <SelectItem value="new">Add as a new channel</SelectItem>
                            <SelectItem value="ignore">Do not save</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRows(null)}>Back</Button>
              <Button disabled={saving || !rows.some((r) => r.match !== 'ignore')} onClick={save}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
