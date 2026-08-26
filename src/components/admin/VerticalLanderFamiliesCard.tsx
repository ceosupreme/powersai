import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useVerticalLanderFamilies,
  useUpsertVerticalLanderFamily,
  useDeleteVerticalLanderFamily,
} from "@/hooks/useVerticalLanders";

const JSON_FIELDS = ["tour_features", "included_features", "how_it_works", "faq_base", "math_config"] as const;
const TEXT_FIELDS = ["display_name", "live_in_line", "proof_line", "guarantee_line"] as const;

type Draft = Record<string, any> & { family_key: string };

const toText = (v: any) => (v == null ? "" : JSON.stringify(v, null, 2));

export const VerticalLanderFamiliesCard = () => {
  const { data: families = [], isLoading } = useVerticalLanderFamilies();
  const upsert = useUpsertVerticalLanderFamily();
  const remove = useDeleteVerticalLanderFamily();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [raw, setRaw] = useState<Record<string, string>>({});

  const open = (row?: any) => {
    const base: Draft = row ? { ...row } : { family_key: "", display_name: "" };
    setEditing(base);
    setRaw(Object.fromEntries(JSON_FIELDS.map((f) => [f, toText(base[f])])));
  };

  const save = async () => {
    if (!editing?.family_key.trim()) return;
    const payload: Draft = { family_key: editing.family_key.trim() };
    TEXT_FIELDS.forEach((f) => { payload[f] = editing[f]?.trim?.() || null; });
    for (const f of JSON_FIELDS) {
      const txt = (raw[f] ?? "").trim();
      if (!txt) { payload[f] = null; continue; }
      try { payload[f] = JSON.parse(txt); } catch { toast.error(`Invalid JSON in ${f}`); return; }
    }
    await upsert.mutateAsync(payload);
    setEditing(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Lander Families</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared section content inherited by any lander whose <code>family_key</code> matches.
          </p>
        </div>
        <Button size="sm" onClick={() => open()}><Plus className="mr-2 h-4 w-4" />New family</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : families.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No families yet.</p>
        ) : (
          <div className="space-y-2">
            {families.map((f: any) => (
              <div key={f.family_key} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{f.display_name || f.family_key}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{f.family_key}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => open(f)}><Pencil className="h-4 w-4" /></Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => { if (confirm(`Delete family "${f.family_key}"?`)) remove.mutate(f.family_key); }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editing?.created_at ? "Edit family" : "New family"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Family key</Label>
                  <Input
                    value={editing.family_key}
                    disabled={!!editing.created_at}
                    onChange={(e) => setEditing({ ...editing, family_key: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Display name</Label>
                  <Input value={editing.display_name ?? ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} />
                </div>
              </div>
              {(["live_in_line", "proof_line", "guarantee_line"] as const).map((f) => (
                <div key={f}>
                  <Label className="capitalize">{f.replace(/_/g, " ")}</Label>
                  <Textarea rows={2} value={editing[f] ?? ""} onChange={(e) => setEditing({ ...editing, [f]: e.target.value })} />
                </div>
              ))}
              {JSON_FIELDS.map((f) => (
                <div key={f}>
                  <Label className="capitalize">{f.replace(/_/g, " ")} (JSON)</Label>
                  <Textarea
                    rows={5}
                    className="font-mono text-xs"
                    value={raw[f] ?? ""}
                    onChange={(e) => setRaw({ ...raw, [f]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending || !editing?.family_key?.trim()}>
              {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VerticalLanderFamiliesCard;
