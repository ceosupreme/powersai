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
import { Loader2, Plus, Trash2, Save, ExternalLink, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import {
  useAdminPortfolioItems,
  useUpsertPortfolioItem,
  useDeletePortfolioItem,
  useReorderPortfolioItem,
  slugify,
  type PortfolioItem,
  type PortfolioMediaType,
  type PortfolioStatus,
} from "@/hooks/usePortfolioItems";

const MEDIA_TYPES: { value: PortfolioMediaType; label: string }[] = [
  { value: "image", label: "Image / Graphic" },
  { value: "video", label: "Video (file or YouTube/Vimeo)" },
  { value: "link", label: "Live site link (opens in new tab)" },
  { value: "embed", label: "Live embed (iframe preview)" },
  { value: "case_study", label: "Case study (detail page)" },
];

const COMMON_CATEGORIES = ["Websites", "AI Systems", "Graphics", "Video", "Case Studies", "Other"];

type DraftItem = Partial<PortfolioItem> & {
  title: string;
  slug: string;
  category: string;
  media_type: PortfolioMediaType;
  status: PortfolioStatus;
};

const emptyDraft = (): DraftItem => ({
  title: "",
  slug: "",
  description: "",
  client_or_vertical: "",
  category: "Websites",
  media_type: "image",
  image_url: "",
  video_url: "",
  external_url: "",
  thumbnail_url: "",
  case_study_body: "",
  featured: false,
  sort_order: 0,
  status: "draft",
});

export const PortfolioItemsTab = () => {
  const { data: items = [], isLoading } = useAdminPortfolioItems();
  const upsert = useUpsertPortfolioItem();
  const remove = useDeletePortfolioItem();
  const reorder = useReorderPortfolioItem();

  const [editing, setEditing] = useState<DraftItem | null>(null);

  const openNew = () => setEditing({ ...emptyDraft(), sort_order: items.length });
  const openEdit = (it: PortfolioItem) => setEditing({ ...it });

  const save = async () => {
    if (!editing) return;
    const payload: DraftItem = {
      ...editing,
      slug: editing.slug?.trim() || slugify(editing.title),
      title: editing.title.trim(),
    };
    if (!payload.title) return;
    await upsert.mutateAsync(payload as any);
    setEditing(null);
  };

  const move = (it: PortfolioItem, dir: -1 | 1) => {
    const idx = items.findIndex((x) => x.id === it.id);
    const swapWith = items[idx + dir];
    if (!swapWith) return;
    reorder.mutate({ id: it.id, sort_order: swapWith.sort_order });
    reorder.mutate({ id: swapWith.id, sort_order: it.sort_order });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">Portfolio / Work showcase</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage what appears on the public <code>/work</code> page.
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="mr-2 h-4 w-4" /> New item
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No items yet. Click "New item" to add your first piece.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div
                key={it.id}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
              >
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-muted">
                  {(it.thumbnail_url || it.image_url) && (
                    <img
                      src={it.thumbnail_url || it.image_url || ""}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{it.title}</span>
                    <Badge variant={it.status === "published" ? "default" : "secondary"}>
                      {it.status}
                    </Badge>
                    {it.featured && <Badge variant="outline">Featured</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {it.category} · {it.media_type} · /{it.slug}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => move(it, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={idx === items.length - 1}
                    onClick={() => move(it, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(it)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete "${it.title}"?`)) remove.mutate(it.id);
                    }}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit item" : "New portfolio item"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Title</Label>
                  <Input
                    value={editing.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setEditing({
                        ...editing,
                        title,
                        slug: editing.id ? editing.slug : slugify(title),
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={editing.slug}
                    onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Client / vertical (optional)</Label>
                  <Input
                    value={editing.client_or_vertical ?? ""}
                    onChange={(e) => setEditing({ ...editing, client_or_vertical: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Select
                    value={editing.category}
                    onValueChange={(v) => setEditing({ ...editing, category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMMON_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Media type</Label>
                  <Select
                    value={editing.media_type}
                    onValueChange={(v) =>
                      setEditing({ ...editing, media_type: v as PortfolioMediaType })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEDIA_TYPES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>Short description</Label>
                  <Textarea
                    rows={2}
                    value={editing.description ?? ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Thumbnail URL (card image — used by every media type)</Label>
                  <Input
                    value={editing.thumbnail_url ?? ""}
                    placeholder="https://…"
                    onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })}
                  />
                </div>

                {(editing.media_type === "image" || editing.media_type === "case_study") && (
                  <div className="col-span-2">
                    <Label>Full image URL (lightbox / hero)</Label>
                    <Input
                      value={editing.image_url ?? ""}
                      placeholder="https://…"
                      onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                    />
                  </div>
                )}

                {editing.media_type === "video" && (
                  <div className="col-span-2">
                    <Label>Video URL (file, YouTube, or Vimeo)</Label>
                    <Input
                      value={editing.video_url ?? ""}
                      placeholder="https://www.youtube.com/watch?v=…"
                      onChange={(e) => setEditing({ ...editing, video_url: e.target.value })}
                    />
                  </div>
                )}

                {(editing.media_type === "link" ||
                  editing.media_type === "embed" ||
                  editing.media_type === "case_study") && (
                  <div className="col-span-2">
                    <Label>External URL (live site / demo)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editing.external_url ?? ""}
                        placeholder="https://…"
                        onChange={(e) => setEditing({ ...editing, external_url: e.target.value })}
                      />
                      {editing.external_url && (
                        <a
                          href={editing.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-md border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {editing.media_type === "case_study" && (
                  <div className="col-span-2">
                    <Label>Case study body (plain text or markdown-ish)</Label>
                    <Textarea
                      rows={10}
                      value={editing.case_study_body ?? ""}
                      onChange={(e) => setEditing({ ...editing, case_study_body: e.target.value })}
                    />
                  </div>
                )}

                <div className="col-span-2 flex flex-wrap items-center gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editing.status === "published"}
                      onCheckedChange={(v) =>
                        setEditing({ ...editing, status: v ? "published" : "draft" })
                      }
                    />
                    <Label>Published</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!editing.featured}
                      onCheckedChange={(v) => setEditing({ ...editing, featured: v })}
                    />
                    <Label>Featured</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Sort order</Label>
                    <Input
                      type="number"
                      className="w-24"
                      value={editing.sort_order ?? 0}
                      onChange={(e) =>
                        setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending || !editing?.title}>
              {upsert.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PortfolioItemsTab;