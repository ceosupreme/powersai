import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Save, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";

import {
  useAdminVerticalLanders,
  useUpsertVerticalLander,
  useDeleteVerticalLander,
  slugifyLander,
  type VerticalLandingPage,
  type AccentColor,
  type LanderStatus,
  type LeakCard,
  type FaqEntry,
} from "@/hooks/useVerticalLanders";

type Draft = Partial<VerticalLandingPage> & {
  slug: string;
  display_name: string;
  status: LanderStatus;
  accent_color: AccentColor;
  leaks: LeakCard[];
  faq: FaqEntry[];
};

/** Additive jsonb columns edited as raw JSON. Blank means null (inherit from family / omit section). */
const JSON_FIELDS = ["tour_features", "included_features", "how_it_works", "math_config", "price_block"] as const;
const toJsonText = (v: any) => (v == null ? "" : JSON.stringify(v, null, 2));


const emptyDraft = (): Draft => ({
  slug: "",
  display_name: "",
  status: "draft",
  sort_order: 0,
  headline: "",
  headline_accent_word: "",
  accent_color: "rust",
  subline: "",
  stat_value: "",
  stat_label: "",
  leaks: [{ title: "", line: "", dollar_note: "" }],
  faq: [{ q: "", a: "" }],
  proof_line: "",
  cta_primary_label: "Run your free Profit Leak Audit",
  cta_primary_url: "/#contact",
  cta_secondary_label: "",
  cta_secondary_url: "",
  meta_title: "",
  meta_description: "",
  project_type_id: null,
  og_image_url: "",
});

export const VerticalLandersTab = () => {
  const { data: items = [], isLoading } = useAdminVerticalLanders();
  const upsert = useUpsertVerticalLander();
  const remove = useDeleteVerticalLander();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [rawJson, setRawJson] = useState<Record<string, string>>({});

  const seedRaw = (row: any) =>
    setRawJson(Object.fromEntries(JSON_FIELDS.map((f) => [f, toJsonText(row?.[f])])));

  const openNew = () => {
    const d = { ...emptyDraft(), sort_order: (items[items.length - 1]?.sort_order ?? 0) + 10 };
    setEditing(d);
    seedRaw(d);
  };
  const openEdit = (it: VerticalLandingPage) => {
    setEditing({
      ...it,
      leaks: Array.isArray(it.leaks) ? it.leaks : [],
      faq: Array.isArray(it.faq) ? it.faq : [],
      cta_secondary_label: it.cta_secondary_label ?? "",
      cta_secondary_url: it.cta_secondary_url ?? "",
      og_image_url: it.og_image_url ?? "",
    });
    seedRaw(it);
  };

  const save = async () => {
    if (!editing) return;
    const payload: Record<string, any> = {
      ...editing,
      slug: editing.slug.trim() || slugifyLander(editing.display_name),
      display_name: editing.display_name.trim(),
      cta_secondary_label: editing.cta_secondary_label?.trim() || null,
      cta_secondary_url: editing.cta_secondary_url?.trim() || null,
      og_image_url: editing.og_image_url?.trim() || null,
      leaks: editing.leaks.filter((l) => l.title.trim() || l.line.trim()),
      faq: editing.faq.filter((f) => f.q.trim() || f.a.trim()),
    };
    for (const f of JSON_FIELDS) {
      const txt = (rawJson[f] ?? "").trim();
      if (!txt) { payload[f] = null; continue; }
      try { payload[f] = JSON.parse(txt); } catch { toast.error(`Invalid JSON in ${f}`); return; }
    }
    if (!payload.slug || !payload.display_name) return;
    await upsert.mutateAsync(payload as any);
    setEditing(null);
  };


  const setLeak = (i: number, patch: Partial<LeakCard>) => {
    if (!editing) return;
    const leaks = editing.leaks.slice();
    leaks[i] = { ...leaks[i], ...patch };
    setEditing({ ...editing, leaks });
  };
  const addLeak = () => editing && setEditing({ ...editing, leaks: [...editing.leaks, { title: "", line: "", dollar_note: "" }] });
  const removeLeak = (i: number) => editing && setEditing({ ...editing, leaks: editing.leaks.filter((_, idx) => idx !== i) });

  const setFaq = (i: number, patch: Partial<FaqEntry>) => {
    if (!editing) return;
    const faq = editing.faq.slice();
    faq[i] = { ...faq[i], ...patch };
    setEditing({ ...editing, faq });
  };
  const addFaq = () => editing && setEditing({ ...editing, faq: [...editing.faq, { q: "", a: "" }] });
  const removeFaq = (i: number) => editing && setEditing({ ...editing, faq: editing.faq.filter((_, idx) => idx !== i) });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Vertical Landers</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage per-vertical landing pages served at <code>/for/[slug]</code>.
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="mr-2 h-4 w-4" /> New lander
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No landers yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{it.display_name}</span>
                    <Badge variant={it.status === "published" ? "default" : "secondary"}>{it.status}</Badge>
                    <Badge variant="outline">sort {it.sort_order}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">/for/{it.slug}</div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`/for/${it.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="View page"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(it)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { if (confirm(`Delete "${it.display_name}"?`)) remove.mutate(it.id); }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit lander" : "New lander"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Display name</Label>
                  <Input
                    value={editing.display_name}
                    onChange={(e) => {
                      const display_name = e.target.value;
                      setEditing({
                        ...editing,
                        display_name,
                        slug: editing.id ? editing.slug : slugifyLander(display_name),
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: slugifyLander(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Headline</Label>
                  <Input value={editing.headline ?? ""} onChange={(e) => setEditing({ ...editing, headline: e.target.value })} />
                </div>
                <div>
                  <Label>Accent word (must appear in headline)</Label>
                  <Input value={editing.headline_accent_word ?? ""} onChange={(e) => setEditing({ ...editing, headline_accent_word: e.target.value })} />
                </div>
                <div>
                  <Label>Accent color</Label>
                  <Select value={editing.accent_color} onValueChange={(v) => setEditing({ ...editing, accent_color: v as AccentColor })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rust">Rust</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>Subline</Label>
                  <Textarea rows={3} value={editing.subline ?? ""} onChange={(e) => setEditing({ ...editing, subline: e.target.value })} />
                </div>
                <div>
                  <Label>Stat value</Label>
                  <Input value={editing.stat_value ?? ""} onChange={(e) => setEditing({ ...editing, stat_value: e.target.value })} />
                </div>
                <div>
                  <Label>Stat label</Label>
                  <Input value={editing.stat_label ?? ""} onChange={(e) => setEditing({ ...editing, stat_label: e.target.value })} />
                </div>

                <div className="col-span-2">
                  <Label>Proof line</Label>
                  <Textarea rows={3} value={editing.proof_line ?? ""} onChange={(e) => setEditing({ ...editing, proof_line: e.target.value })} />
                </div>

                <div>
                  <Label>Primary CTA label</Label>
                  <Input value={editing.cta_primary_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_primary_label: e.target.value })} />
                </div>
                <div>
                  <Label>Primary CTA URL</Label>
                  <Input value={editing.cta_primary_url ?? ""} onChange={(e) => setEditing({ ...editing, cta_primary_url: e.target.value })} />
                </div>
                <div>
                  <Label>Secondary CTA label (optional)</Label>
                  <Input value={editing.cta_secondary_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_secondary_label: e.target.value })} />
                </div>
                <div>
                  <Label>Secondary CTA URL (optional)</Label>
                  <Input value={editing.cta_secondary_url ?? ""} onChange={(e) => setEditing({ ...editing, cta_secondary_url: e.target.value })} />
                </div>

                <div className="col-span-2">
                  <Label>Meta title</Label>
                  <Input value={editing.meta_title ?? ""} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Meta description</Label>
                  <Textarea rows={2} value={editing.meta_description ?? ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>OG image URL (optional)</Label>
                  <Input value={editing.og_image_url ?? ""} onChange={(e) => setEditing({ ...editing, og_image_url: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Project type id (optional — pulls up to 2 extra leak vectors)</Label>
                  <Input value={editing.project_type_id ?? ""} onChange={(e) => setEditing({ ...editing, project_type_id: e.target.value || null })} />
                </div>

                <div>
                  <Label>Family key (optional — inherits shared content)</Label>
                  <Input value={(editing as any).family_key ?? ""} onChange={(e) => setEditing({ ...editing, family_key: e.target.value || null } as Draft)} />
                </div>
                <div>
                  <Label>Video URL (optional — YouTube, Loom, or .mp4)</Label>
                  <Input value={(editing as any).video_url ?? ""} onChange={(e) => setEditing({ ...editing, video_url: e.target.value || null } as Draft)} />
                </div>
                <div className="col-span-2">
                  <Label>Leaks heading override (optional)</Label>
                  <Input value={(editing as any).leaks_heading ?? ""} onChange={(e) => setEditing({ ...editing, leaks_heading: e.target.value || null } as Draft)} />
                </div>
                <div className="col-span-2">
                  <Label>Live-in line (optional)</Label>
                  <Textarea rows={2} value={(editing as any).live_in_line ?? ""} onChange={(e) => setEditing({ ...editing, live_in_line: e.target.value || null } as Draft)} />
                </div>
                <div className="col-span-2">
                  <Label>Free check line (optional)</Label>
                  <Textarea rows={2} value={(editing as any).free_check_line ?? ""} onChange={(e) => setEditing({ ...editing, free_check_line: e.target.value || null } as Draft)} />
                </div>
                <div className="col-span-2">
                  <Label>Guarantee line (optional)</Label>
                  <Textarea rows={2} value={(editing as any).guarantee_line ?? ""} onChange={(e) => setEditing({ ...editing, guarantee_line: e.target.value || null } as Draft)} />
                </div>
                {JSON_FIELDS.map((f) => (
                  <div key={f} className="col-span-2">
                    <Label className="capitalize">{f.replace(/_/g, " ")} (JSON — leave blank to inherit / omit)</Label>
                    <Textarea
                      rows={5}
                      className="font-mono text-xs"
                      value={rawJson[f] ?? ""}
                      onChange={(e) => setRawJson({ ...rawJson, [f]: e.target.value })}
                    />
                  </div>
                ))}
              </div>


              <div className="rounded-md border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Label>Leak cards</Label>
                  <Button size="sm" variant="outline" onClick={addLeak}><Plus className="mr-1 h-3 w-3" />Add</Button>
                </div>
                <div className="space-y-3">
                  {editing.leaks.map((leak, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 rounded-md border border-border/60 p-2">
                      <Input className="col-span-4" placeholder="Title" value={leak.title} onChange={(e) => setLeak(i, { title: e.target.value })} />
                      <Input className="col-span-5" placeholder="Line" value={leak.line} onChange={(e) => setLeak(i, { line: e.target.value })} />
                      <Input className="col-span-2" placeholder="Dollar note" value={leak.dollar_note} onChange={(e) => setLeak(i, { dollar_note: e.target.value })} />
                      <Button size="icon" variant="ghost" className="col-span-1" onClick={() => removeLeak(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Label>FAQ</Label>
                  <Button size="sm" variant="outline" onClick={addFaq}><Plus className="mr-1 h-3 w-3" />Add</Button>
                </div>
                <div className="space-y-3">
                  {editing.faq.map((f, i) => (
                    <div key={i} className="space-y-2 rounded-md border border-border/60 p-2">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Question" value={f.q} onChange={(e) => setFaq(i, { q: e.target.value })} />
                        <Button size="icon" variant="ghost" onClick={() => removeFaq(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <Textarea rows={2} placeholder="Answer" value={f.a} onChange={(e) => setFaq(i, { a: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.status === "published"}
                    onCheckedChange={(v) => setEditing({ ...editing, status: v ? "published" : "draft" })}
                  />
                  <Label>Published</Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending || !editing?.display_name || !editing?.slug}>
              {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VerticalLandersTab;