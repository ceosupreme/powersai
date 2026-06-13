import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Copy, Palette, Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';
import {
  useBrandKitData, useSaveKit, useChildMutations,
  useBrandKitArchive, useBrandKitLinkCounts,
  type BrandColor, type BrandTagline, type BrandHashtag, type BrandLink,
} from '@/hooks/useBrandKit';
import { AssetUploader } from '@/components/brand-kit/AssetUploader';
import { ArchiveOrDeleteDialog, type LinkedLine } from '@/components/shared/ArchiveOrDeleteDialog';

const copy = (text: string) => {
  navigator.clipboard.writeText(text).then(() => toast.success('Copied'));
};

export default function BrandKit() {
  const { selectedBar } = useApp();
  const projectId = selectedBar?.id ?? null;
  const [showArchived, setShowArchived] = useState(false);
  const { kitQuery, kitId, ensureKit, colors, taglines, hashtags, links, assets } =
    useBrandKitData(projectId, { includeArchived: showArchived });
  const saveKit = useSaveKit(projectId);
  const archiveM = useBrandKitArchive();
  const linkCounts = useBrandKitLinkCounts(kitId);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Local form state
  const k = kitQuery.data;
  const [form, setForm] = useState({
    brand_voice: '', bio_short: '', bio_long: '',
    primary_font: '', secondary_font: '', do_notes: '', dont_notes: '',
  });
  useEffect(() => {
    if (k) {
      setForm({
        brand_voice: k.brand_voice ?? '',
        bio_short: k.bio_short ?? '',
        bio_long: k.bio_long ?? '',
        primary_font: k.primary_font ?? '',
        secondary_font: k.secondary_font ?? '',
        do_notes: k.do_notes ?? '',
        dont_notes: k.dont_notes ?? '',
      });
    }
  }, [k?.id]);

  if (!projectId) {
    return <div className="p-6 text-muted-foreground">Select a project to view its Brand Kit.</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Brand Kit
            {k?.archived && <Badge variant="outline" className="text-xs">Archived</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">{selectedBar?.bar_name}</p>
        </div>
        {k && !k.archived && (
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Archive className="h-4 w-4 mr-1" /> Archive…
          </Button>
        )}
        {k?.archived && (
          <Button size="sm" variant="outline" onClick={() => archiveM.restoreKit.mutate(k.id)}>
            <ArchiveRestore className="h-4 w-4 mr-1" /> Restore
          </Button>
        )}
        {!kitQuery.data && !showArchived && (
          <Button size="sm" variant="ghost" onClick={() => setShowArchived(true)}>Show archived</Button>
        )}
      </header>

      {k && (
        <ArchiveOrDeleteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          entityLabel="brand kit"
          entityName={selectedBar?.bar_name ?? 'this kit'}
          allowArchive={!k.archived}
          extraNote="Storage files (uploaded images, PDFs) live in object storage and are kept separately — only the asset records here are removed."
          linkedLines={(() => {
            const lc = linkCounts.data;
            if (!lc) return [];
            const lines: LinkedLine[] = [];
            if (lc.colors)   lines.push({ count: lc.colors,   label: 'color records',   effect: 'destroyed' });
            if (lc.taglines) lines.push({ count: lc.taglines, label: 'tagline records', effect: 'destroyed' });
            if (lc.hashtags) lines.push({ count: lc.hashtags, label: 'hashtag records', effect: 'destroyed' });
            if (lc.links)    lines.push({ count: lc.links,    label: 'link records',    effect: 'destroyed' });
            if (lc.assets)   lines.push({ count: lc.assets,   label: 'asset records',   effect: 'destroyed' });
            return lines;
          })()}
          onArchive={async (reason) => {
            await archiveM.archiveKit.mutateAsync({ id: k.id, reason });
            toast.success('Brand kit archived');
          }}
          onDelete={async () => {
            await archiveM.deleteKit.mutateAsync(k.id);
            toast.success('Brand kit deleted');
          }}
        />
      )}

      {/* Voice & bios */}
      <Card>
        <CardHeader><CardTitle>Voice &amp; Bios</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Brand Voice</Label>
            <Textarea rows={3} value={form.brand_voice} onChange={(e) => setForm({ ...form, brand_voice: e.target.value })}
              placeholder="How the brand sounds. Tone, attitude, style guidelines." />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Short Bio</Label>
              <Textarea rows={3} value={form.bio_short} onChange={(e) => setForm({ ...form, bio_short: e.target.value })} />
            </div>
            <div>
              <Label>Long Bio</Label>
              <Textarea rows={3} value={form.bio_long} onChange={(e) => setForm({ ...form, bio_long: e.target.value })} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Primary Font</Label>
              <Input value={form.primary_font} onChange={(e) => setForm({ ...form, primary_font: e.target.value })} placeholder="e.g. Inter" />
            </div>
            <div>
              <Label>Secondary Font</Label>
              <Input value={form.secondary_font} onChange={(e) => setForm({ ...form, secondary_font: e.target.value })} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Do</Label>
              <Textarea rows={3} value={form.do_notes} onChange={(e) => setForm({ ...form, do_notes: e.target.value })} />
            </div>
            <div>
              <Label>Don&apos;t</Label>
              <Textarea rows={3} value={form.dont_notes} onChange={(e) => setForm({ ...form, dont_notes: e.target.value })} />
            </div>
          </div>
          <Button onClick={() => saveKit.mutate(form)} disabled={saveKit.isPending}>
            {saveKit.isPending ? 'Saving…' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <ColorsSection kitId={kitId} ensureKit={ensureKit} items={colors.data ?? []} />
      <TaglinesSection kitId={kitId} ensureKit={ensureKit} items={taglines.data ?? []} />
      <HashtagsSection kitId={kitId} ensureKit={ensureKit} items={hashtags.data ?? []} />
      <LinksSection kitId={kitId} ensureKit={ensureKit} items={links.data ?? []} />

      <Card>
        <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
        <CardContent>
          {!kitId ? (
            <div className="text-sm text-muted-foreground">
              Save the brand voice above first to enable uploads.
            </div>
          ) : (
            <AssetUploader projectId={projectId} kitId={kitId} assets={assets.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function useEnsuredKitId(kitId: string | null, ensureKit: () => Promise<string>) {
  return async () => kitId ?? (await ensureKit());
}

/* ---------------- Colors ---------------- */
function ColorsSection({ kitId, ensureKit, items }: { kitId: string | null; ensureKit: () => Promise<string>; items: BrandColor[] }) {
  const m = useChildMutations<BrandColor>('brand_kit_colors', kitId, 'brand-colors');
  const getKit = useEnsuredKitId(kitId, ensureKit);
  const [hex, setHex] = useState('#'); const [label, setLabel] = useState('');

  const add = async () => {
    if (!hex.trim()) return;
    const id = await getKit();
    await m.add.mutateAsync({ kit_id: id, hex: hex.trim(), label: label || null, sort_order: items.length } as any);
    setHex('#'); setLabel('');
  };

  return (
    <Card>
      <CardHeader><CardTitle>Colors</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3">
          {items.map((c) => (
            <div key={c.id} className="border rounded-md p-2 flex items-center gap-2">
              <button
                className="w-10 h-10 rounded border"
                style={{ background: c.hex }}
                onClick={() => copy(c.hex)}
                title="Copy hex"
              />
              <div className="text-xs">
                <div className="font-medium">{c.label || '—'}</div>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => copy(c.hex)}>
                  {c.hex} <Copy className="inline h-3 w-3" />
                </button>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => m.remove.mutate(c.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input className="w-32" value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#1a1a2e" />
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Primary)" />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Taglines ---------------- */
function TaglinesSection({ kitId, ensureKit, items }: { kitId: string | null; ensureKit: () => Promise<string>; items: BrandTagline[] }) {
  const m = useChildMutations<BrandTagline>('brand_kit_taglines', kitId, 'brand-taglines');
  const getKit = useEnsuredKitId(kitId, ensureKit);
  const [text, setText] = useState(''); const [ctx, setCtx] = useState('');
  const add = async () => {
    if (!text.trim()) return;
    const id = await getKit();
    await m.add.mutateAsync({ kit_id: id, text: text.trim(), context: ctx || null, sort_order: items.length } as any);
    setText(''); setCtx('');
  };
  return (
    <Card>
      <CardHeader><CardTitle>Taglines</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id} className="flex items-center gap-2 border rounded-md p-2">
              <button onClick={() => copy(t.text)} className="text-left flex-1 hover:text-primary">{t.text}</button>
              {t.context && <Badge variant="outline">{t.context}</Badge>}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(t.text)}><Copy className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => m.remove.mutate(t.id)}><X className="h-3 w-3" /></Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tagline" />
          <Input className="w-40" value={ctx} onChange={(e) => setCtx(e.target.value)} placeholder="Context (optional)" />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Hashtags ---------------- */
function HashtagsSection({ kitId, ensureKit, items }: { kitId: string | null; ensureKit: () => Promise<string>; items: BrandHashtag[] }) {
  const m = useChildMutations<BrandHashtag>('brand_kit_hashtags', kitId, 'brand-hashtags');
  const getKit = useEnsuredKitId(kitId, ensureKit);
  const [tag, setTag] = useState(''); const [group, setGroup] = useState('');
  const add = async () => {
    if (!tag.trim()) return;
    const id = await getKit();
    await m.add.mutateAsync({ kit_id: id, tag: tag.trim(), group_label: group || null, sort_order: items.length } as any);
    setTag(''); setGroup('');
  };
  return (
    <Card>
      <CardHeader><CardTitle>Hashtags</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {items.map((h) => (
            <Badge key={h.id} variant="secondary" className="gap-1 cursor-pointer" onClick={() => copy('#' + h.tag)}>
              #{h.tag}{h.group_label ? ` · ${h.group_label}` : ''}
              <button onClick={(e) => { e.stopPropagation(); m.remove.mutate(h.id); }}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="hashtag (no #)" />
          <Input className="w-40" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Group (optional)" />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Links ---------------- */
function LinksSection({ kitId, ensureKit, items }: { kitId: string | null; ensureKit: () => Promise<string>; items: BrandLink[] }) {
  const m = useChildMutations<BrandLink>('brand_kit_links', kitId, 'brand-links');
  const getKit = useEnsuredKitId(kitId, ensureKit);
  const [label, setLabel] = useState(''); const [url, setUrl] = useState(''); const [cat, setCat] = useState('');
  const add = async () => {
    if (!url.trim()) return;
    const id = await getKit();
    await m.add.mutateAsync({ kit_id: id, label: label || null, url: url.trim(), category: cat || null, sort_order: items.length } as any);
    setLabel(''); setUrl(''); setCat('');
  };
  return (
    <Card>
      <CardHeader><CardTitle>Links</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {items.map((l) => (
            <li key={l.id} className="flex items-center gap-2 border rounded-md p-2">
              <a href={l.url} target="_blank" rel="noreferrer" className="flex-1 hover:text-primary truncate">
                {l.label || l.url}
              </a>
              {l.category && <Badge variant="outline">{l.category}</Badge>}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(l.url)}><Copy className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => m.remove.mutate(l.id)}><X className="h-3 w-3" /></Button>
            </li>
          ))}
        </ul>
        <div className="grid md:grid-cols-3 gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          <div className="flex gap-2">
            <Input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Category (optional)" />
            <Button onClick={add}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}